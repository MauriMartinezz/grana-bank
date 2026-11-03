"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidateAccountScreens } from "@/features/account/revalidate";
import { getCurrentUser } from "@/features/auth/current-user";
import { validateNote } from "@/features/categories/names";
import { isCardId } from "@/features/exchange/confirmation";
import { isIdempotencyKey } from "@/features/transfers/confirmation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { confirmationPath } from "./confirmation";
import { resolvePesoCard, resolveTarget, topUp, type TopUpError } from "./top-up";
import {
  isProviderOf,
  isTopUpKind,
  MESSAGES,
  normalizeDirectvAccount,
  normalizeNickname,
  normalizePhone,
  parseTopUpAmount,
  validateSubeCard,
  type SubeCardErrors,
  type TopUpKind,
} from "./validation";

export type AddSubeCardState =
  | {
      values: { number: string; nickname: string };
      errors: SubeCardErrors & { form?: string };
    }
  | undefined;

export type TopUpFormState = { error: string } | undefined;

const TOP_UP_ERRORS: Record<TopUpError, string> = {
  INVALID_AMOUNT: "El monto no es válido. Volvé a ingresarlo.",
  INVALID_TARGET: "Los datos de la recarga no son válidos. Volvé a cargarlos.",
  SUBE_CARD_NOT_FOUND: "Esta tarjeta SUBE ya no está disponible.",
  INSUFFICIENT_FUNDS: "No tenés saldo suficiente para esta recarga.",
  CARD_NOT_FOUND: "Esta tarjeta ya no está disponible.",
  CURRENCY_MISMATCH: "Elegí una tarjeta de tu cuenta en pesos.",
  IDEMPOTENCY_MISMATCH: "La operación expiró. Volvé a intentarlo.",
  INVALID_NOTE: "La nota tiene hasta 140 caracteres.",
};
const INVALID_KIND = "Elegí qué querés recargar.";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function addSubeCard(
  _previous: AddSubeCardState,
  formData: FormData,
): Promise<AddSubeCardState> {
  const user = await getCurrentUser();
  const number = text(formData, "number").trim();
  const result = validateSubeCard({ number, nickname: text(formData, "nickname") });
  const values = {
    number,
    nickname: result.ok ? result.card.nickname : normalizeNickname(text(formData, "nickname")),
  };
  if (!result.ok) return { values, errors: result.errors };

  try {
    // The unique (user, number) index rejects a duplicate, also when two
    // submits of the same card race.
    await db.subeCard.create({ data: { userId: user.id, ...result.card } });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { values, errors: { form: "Ya agregaste esta tarjeta SUBE." } };
    }
    console.error("SUBE card creation failed", error);
    return { values, errors: { form: "No pudimos agregar la tarjeta. Probá de nuevo." } };
  }

  revalidatePath("/recargas/sube");
  redirect("/recargas/sube");
}

/** The form's own message for a missing or malformed target. */
function checkTarget(kind: TopUpKind, target: string): string | null {
  if (kind === "SUBE") return isCardId(target) ? null : TOP_UP_ERRORS.SUBE_CARD_NOT_FOUND;
  if (kind === "PHONE") {
    if (!target.trim()) return MESSAGES.phoneEmpty;
    return normalizePhone(target) ? null : MESSAGES.phoneInvalid;
  }
  if (!target.trim()) return MESSAGES.directvEmpty;
  return normalizeDirectvAccount(target) ? null : MESSAGES.directvInvalid;
}

export async function reviewTopUp(
  _previous: TopUpFormState,
  formData: FormData,
): Promise<TopUpFormState> {
  const user = await getCurrentUser();
  const kind = formData.get("kind");
  const provider = formData.get("provider");
  const rawTarget = text(formData, "target");
  const cardId = text(formData, "cardId");

  if (!isTopUpKind(kind)) return { error: INVALID_KIND };
  if (!isProviderOf(kind, provider)) return { error: MESSAGES.providerInvalid };
  const targetError = checkTarget(kind, rawTarget);
  if (targetError) return { error: targetError };
  const amount = parseTopUpAmount(text(formData, "amount"));
  if (!amount.ok) return { error: amount.error };
  if (!isCardId(cardId)) return { error: TOP_UP_ERRORS.CARD_NOT_FOUND };
  const note = validateNote(text(formData, "note"));
  if (!note.ok) return { error: note.error };

  let target: string;
  try {
    const resolved = await resolveTarget(db, user.id, kind, provider, rawTarget);
    if (!resolved.ok) return { error: TOP_UP_ERRORS[resolved.error] };
    target = resolved.target;
    const card = await resolvePesoCard(db, user.id, cardId);
    if (!card.ok) return { error: TOP_UP_ERRORS[card.error] };
    const account = await db.account.findUniqueOrThrow({
      where: { id: card.accountId },
      select: { balanceCents: true, currency: true },
    });
    // Checked again when the top-up runs; this only spares a wasted step.
    if (account.balanceCents < BigInt(amount.cents)) {
      return {
        error: `No tenés saldo suficiente. Disponible: ${formatMoney(account.balanceCents, account.currency)}`,
      };
    }
  } catch (error) {
    console.error("Top-up review failed", error);
    return { error: "No pudimos validar la recarga. Probá de nuevo." };
  }

  // The key is created here and travels in the URL, so going back to the
  // confirmation screen, or retrying after an error, reuses it and can never
  // charge twice.
  redirect(
    confirmationPath(
      { kind, provider, target, amountCents: amount.cents, cardId, note: note.note },
      randomUUID(),
    ),
  );
}

export async function confirmTopUp(
  _previous: TopUpFormState,
  formData: FormData,
): Promise<TopUpFormState> {
  const user = await getCurrentUser();
  const kind = formData.get("kind");
  const provider = formData.get("provider");
  const target = text(formData, "target");
  const rawAmount = text(formData, "amountCents");
  const cardId = text(formData, "cardId");
  // Lower case, so the same key in another case is the same top-up.
  const idempotencyKey = text(formData, "idempotencyKey").toLowerCase();

  if (!isTopUpKind(kind)) return { error: INVALID_KIND };
  if (!isProviderOf(kind, provider)) return { error: TOP_UP_ERRORS.INVALID_TARGET };
  if (!/^\d{1,12}$/.test(rawAmount)) return { error: TOP_UP_ERRORS.INVALID_AMOUNT };
  if (!isIdempotencyKey(idempotencyKey)) return { error: TOP_UP_ERRORS.IDEMPOTENCY_MISMATCH };
  if (!isCardId(cardId)) return { error: TOP_UP_ERRORS.CARD_NOT_FOUND };

  let result;
  try {
    result = await topUp({
      userId: user.id,
      kind,
      provider,
      target,
      amountCents: Number(rawAmount),
      cardId,
      idempotencyKey,
      note: text(formData, "note"),
    });
  } catch (error) {
    console.error("Top-up failed", error);
    // The form keeps its key, so a retry can never charge twice.
    return {
      error: "No pudimos completar la recarga. Probá de nuevo: no se va a cobrar dos veces.",
    };
  }
  if (!result.ok) return { error: TOP_UP_ERRORS[result.error] };

  revalidateAccountScreens();
  redirect(`/recargas/comprobante/${result.movementId}`);
}
