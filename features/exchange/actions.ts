"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/current-user";
import { isIdempotencyKey } from "@/features/transfers/confirmation";
import { parseAmountToCents } from "@/features/transfers/amount";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { confirmationPath, isCardId, isDirection } from "./confirmation";
import { exchange, resolveCardAccounts, type ExchangeError } from "./exchange";
import { MAX_EXCHANGE_USD_CENTS, usdToArsCents } from "./rate";
import { openUsdAccount } from "./usd-account";

export type ExchangeFormState = { error: string } | undefined;

const EXCHANGE_ERRORS: Record<ExchangeError, string> = {
  INVALID_AMOUNT: "El monto no es válido. Volvé a ingresarlo.",
  INSUFFICIENT_FUNDS: "No tenés saldo suficiente para esta operación.",
  CARD_NOT_FOUND: "Esta tarjeta ya no está disponible.",
  CURRENCY_MISMATCH: "Elegí una tarjeta en pesos y una en dólares.",
  IDEMPOTENCY_MISMATCH: "La operación expiró. Volvé a intentarlo.",
};
const INVALID_DIRECTION = "Elegí si querés comprar o vender dólares.";

/** Takes no input: the account is always the current user's. */
export async function openDollarAccount(): Promise<ExchangeFormState> {
  const user = await getCurrentUser();
  try {
    await openUsdAccount(user.id);
  } catch (error) {
    console.error("Opening the dollar account failed", error);
    return { error: "No pudimos abrir la cuenta en dólares. Probá de nuevo." };
  }
  revalidatePath("/", "layout");
  redirect("/exchange");
}

export async function reviewExchange(
  _previous: ExchangeFormState,
  formData: FormData,
): Promise<ExchangeFormState> {
  const user = await getCurrentUser();
  const direction = formData.get("direction");
  const fromCardId = String(formData.get("fromCardId") ?? "");
  const toCardId = String(formData.get("toCardId") ?? "");
  const value = String(formData.get("amount") ?? "");

  if (!isDirection(direction)) return { error: INVALID_DIRECTION };
  if (!value.trim()) return { error: "Ingresá un monto en dólares." };
  const usdCents = parseAmountToCents(value);
  if (usdCents === null) {
    return { error: "Ingresá un monto mayor a cero, con hasta 2 decimales." };
  }
  if (usdCents > MAX_EXCHANGE_USD_CENTS) {
    return {
      error: `El máximo por operación es ${formatMoney(MAX_EXCHANGE_USD_CENTS, "USD")}.`,
    };
  }
  if (!isCardId(fromCardId) || !isCardId(toCardId)) {
    return { error: EXCHANGE_ERRORS.CARD_NOT_FOUND };
  }

  try {
    const accounts = await resolveCardAccounts(db, user.id, direction, fromCardId, toCardId);
    if (!accounts.ok) return { error: EXCHANGE_ERRORS[accounts.error] };
    const from = await db.account.findUniqueOrThrow({
      where: { id: accounts.fromAccountId },
      select: { balanceCents: true, currency: true },
    });
    const debitCents = direction === "BUY" ? usdToArsCents(usdCents) : usdCents;
    // Checked again when the exchange runs; this only spares a wasted step.
    if (from.balanceCents < debitCents) {
      return {
        error: `No tenés saldo suficiente. Disponible: ${formatMoney(from.balanceCents, from.currency)}`,
      };
    }
  } catch (error) {
    console.error("Exchange review failed", error);
    return { error: "No pudimos validar la operación. Probá de nuevo." };
  }

  // The key is created here and travels in the URL, so going back to the
  // confirmation screen, or retrying after an error, reuses it and can never
  // charge twice.
  redirect(confirmationPath({ direction, usdCents, fromCardId, toCardId }, randomUUID()));
}

export async function confirmExchange(
  _previous: ExchangeFormState,
  formData: FormData,
): Promise<ExchangeFormState> {
  const user = await getCurrentUser();
  const direction = formData.get("direction");
  const rawAmount = String(formData.get("usdCents") ?? "");
  const fromCardId = String(formData.get("fromCardId") ?? "");
  const toCardId = String(formData.get("toCardId") ?? "");
  // Lower case, so the same key in another case is the same exchange.
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").toLowerCase();

  if (!isDirection(direction)) return { error: INVALID_DIRECTION };
  if (!/^\d{1,12}$/.test(rawAmount)) return { error: EXCHANGE_ERRORS.INVALID_AMOUNT };
  if (!isIdempotencyKey(idempotencyKey)) return { error: EXCHANGE_ERRORS.IDEMPOTENCY_MISMATCH };
  if (!isCardId(fromCardId) || !isCardId(toCardId)) {
    return { error: EXCHANGE_ERRORS.CARD_NOT_FOUND };
  }

  let result;
  try {
    result = await exchange({
      userId: user.id,
      direction,
      usdCents: Number(rawAmount),
      fromCardId,
      toCardId,
      idempotencyKey,
    });
  } catch (error) {
    console.error("Exchange failed", error);
    // The form keeps its key, so a retry can never charge twice.
    return {
      error: "No pudimos completar la operación. Probá de nuevo: no se va a cobrar dos veces.",
    };
  }
  if (!result.ok) return { error: EXCHANGE_ERRORS[result.error] };

  revalidatePath("/", "layout");
  redirect(`/exchange/success/${result.movementId}`);
}
