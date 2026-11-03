"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { revalidateAccountScreens } from "@/features/account/revalidate";
import { getCurrentUser } from "@/features/auth/current-user";
import { parseAmountToCents } from "@/features/transfers/amount";
import { isIdempotencyKey } from "@/features/transfers/confirmation";
import type { Currency } from "@/generated/prisma/client";
import { formatMoney } from "@/lib/format";
import { deposit, findTestAccount, type DepositError } from "./deposit";
import { MAX_DEPOSIT_CENTS } from "./test-account";

/** The typed values come back, because React resets the form after an action. */
export type DepositFormState = { value: string; currency: Currency; error: string } | undefined;
export type ConfirmDepositState = { error: string } | undefined;

const ACCOUNT_NAMES: Record<Currency, string> = { ARS: "pesos", USD: "dólares" };

function currencyOf(formData: FormData): Currency {
  return formData.get("currency") === "USD" ? "USD" : "ARS";
}

function limitMessage(currency: Currency) {
  return `Podés ingresar hasta ${formatMoney(MAX_DEPOSIT_CENTS[currency], currency)} por vez.`;
}

function depositError(error: DepositError, currency: Currency) {
  switch (error) {
    case "AMOUNT_TOO_HIGH":
      return limitMessage(currency);
    case "NO_ACCOUNT":
      return `No tenés una cuenta en ${ACCOUNT_NAMES[currency]}.`;
    case "TEST_ACCOUNT_MISSING":
      return "La cuenta de prueba no está disponible.";
    case "IDEMPOTENCY_MISMATCH":
      return "La operación expiró. Volvé a intentarlo.";
    default:
      return "El monto no es válido. Volvé a ingresarlo.";
  }
}

export async function reviewDeposit(
  _previous: DepositFormState,
  formData: FormData,
): Promise<DepositFormState> {
  const user = await getCurrentUser();
  const currency = currencyOf(formData);
  const value = String(formData.get("amount") ?? "");
  const fail = (error: string) => ({ value, currency, error });

  if (!value.trim()) return fail("Ingresá un monto.");
  const amountCents = parseAmountToCents(value);
  if (amountCents === null) return fail("Ingresá un monto mayor a cero, con hasta 2 decimales.");
  if (amountCents > MAX_DEPOSIT_CENTS[currency]) return fail(limitMessage(currency));

  try {
    const [account, source] = await Promise.all([
      getAccount(user.id, currency),
      findTestAccount(currency),
    ]);
    if (!account) return fail(depositError("NO_ACCOUNT", currency));
    if (!source) return fail(depositError("TEST_ACCOUNT_MISSING", currency));
  } catch (error) {
    console.error("Deposit review failed", error);
    return fail("No pudimos validar el monto. Probá de nuevo.");
  }

  // The key travels in the URL, so going back or retrying never deposits twice.
  redirect(
    `/ingresar-dinero/confirmar?currency=${currency}&amount=${amountCents}&key=${randomUUID()}`,
  );
}

export async function confirmDeposit(
  _previous: ConfirmDepositState,
  formData: FormData,
): Promise<ConfirmDepositState> {
  const user = await getCurrentUser();
  const currency = currencyOf(formData);
  const rawAmount = String(formData.get("amountCents") ?? "");
  // Lower case, so the same key in another case is the same deposit.
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "").toLowerCase();
  if (!/^\d{1,12}$/.test(rawAmount)) return { error: depositError("INVALID_AMOUNT", currency) };
  if (!isIdempotencyKey(idempotencyKey)) {
    return { error: depositError("IDEMPOTENCY_MISMATCH", currency) };
  }

  let result;
  try {
    result = await deposit({ userId: user.id, currency, amountCents: Number(rawAmount), idempotencyKey });
  } catch (error) {
    console.error("Deposit failed", error);
    return { error: "No pudimos ingresar el dinero. Probá de nuevo: no se va a ingresar dos veces." };
  }
  if (!result.ok) return { error: depositError(result.error, currency) };

  revalidateAccountScreens();
  redirect(`/ingresar-dinero/comprobante/${result.movementId}`);
}
