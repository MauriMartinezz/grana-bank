"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { db } from "@/lib/db";
import { normalizeHolder, validateCard, type CardErrors, type CardFace } from "./validation";

/**
 * What the form gets back after a failed submit. The card number and the
 * security code are never part of it: the form keeps them on the client.
 */
export type AddCardState =
  | {
      values: { holder: string; expiry: string; accountId: string };
      errors: CardErrors & { accountId?: string; form?: string };
    }
  | undefined;

const ACCOUNT_REQUIRED = "Elegí una de tus cuentas.";
const DUPLICATE = "Esta tarjeta ya está agregada a esa cuenta.";
const FAILED = "No pudimos agregar la tarjeta. Probá de nuevo.";

type SaveResult = "SAVED" | "ACCOUNT_NOT_FOUND" | "DUPLICATE";

/**
 * Locks the account row so two submits of the same card cannot both pass the
 * duplicate check, then stores the card face only.
 */
async function saveCard(userId: string, accountId: string, card: CardFace): Promise<SaveResult> {
  return db.$transaction(async (tx) => {
    const owned = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "cuentas"
      WHERE "id" = ${accountId} AND "usuario_id" = ${userId}
      FOR UPDATE`;
    if (owned.length === 0) return "ACCOUNT_NOT_FOUND";

    const existing = await tx.card.findFirst({
      where: { accountId, brand: card.brand, last4: card.last4, expiry: card.expiry },
      select: { id: true },
    });
    if (existing) return "DUPLICATE";

    await tx.card.create({ data: { accountId, ...card } });
    return "SAVED";
  });
}

export async function addCard(_previous: AddCardState, formData: FormData): Promise<AddCardState> {
  const user = await getCurrentUser();
  const field = (name: string) => String(formData.get(name) ?? "");
  const accountId = field("accountId");
  const result = validateCard({
    number: field("number"),
    holder: field("holder"),
    expiry: field("expiry"),
    cvv: field("cvv"),
  });
  const values = {
    holder: result.ok ? result.card.holder : normalizeHolder(field("holder")),
    expiry: field("expiry").trim(),
    accountId,
  };

  if (!result.ok) {
    const errors: NonNullable<AddCardState>["errors"] = { ...result.errors };
    if (!accountId) errors.accountId = ACCOUNT_REQUIRED;
    return { values, errors };
  }

  let saved: SaveResult;
  try {
    saved = await saveCard(user.id, accountId, result.card);
  } catch (error) {
    // Only the error: the form data holds the full number and the code.
    console.error("Card creation failed", error instanceof Error ? error.message : error);
    return { values, errors: { form: FAILED } };
  }

  if (saved === "ACCOUNT_NOT_FOUND") return { values, errors: { accountId: ACCOUNT_REQUIRED } };
  if (saved === "DUPLICATE") return { values, errors: { form: DUPLICATE } };

  revalidatePath("/tarjetas");
  revalidatePath("/inicio");
  redirect("/tarjetas");
}
