"use server";

import type { Currency } from "@/generated/prisma/client";
import { revalidateAccountScreens } from "@/features/account/revalidate";
import { getCurrentUser } from "@/features/auth/current-user";
import { parseAmountToCents } from "@/features/transfers/amount";
import { deleteBudget, setBudget } from "./budgets";

/** The typed amount comes back with an error, because React resets the form. */
export type BudgetFormState = { notice: string } | { error: string; value: string } | undefined;
export type RemoveBudgetState = { notice: string } | { error: string } | undefined;

const CURRENCIES: readonly Currency[] = ["ARS", "USD"];

const BUDGET_MESSAGES = {
  amountEmpty: "Ingresá un monto.",
  amountInvalid: "Ingresá un monto mayor a cero, con hasta 2 decimales.",
  currencyInvalid: "Elegí una cuenta en pesos o en dólares.",
  saveFailed: "No pudimos guardar el presupuesto. Probá de nuevo.",
  removeFailed: "No pudimos quitar el presupuesto. Probá de nuevo.",
} as const;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

/** Sets or changes the monthly budget of one of the user's categories. */
export async function saveBudget(
  _previous: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const user = await getCurrentUser();
  const value = text(formData, "amount");
  const currency = text(formData, "currency") as Currency;

  if (!CURRENCIES.includes(currency)) return { error: BUDGET_MESSAGES.currencyInvalid, value };
  if (!value.trim()) return { error: BUDGET_MESSAGES.amountEmpty, value };
  const cents = parseAmountToCents(value);
  if (cents === null) return { error: BUDGET_MESSAGES.amountInvalid, value };

  let result;
  try {
    result = await setBudget(user.id, text(formData, "categoryId"), currency, cents);
  } catch (error) {
    console.error("Budget save failed", error);
    return { error: BUDGET_MESSAGES.saveFailed, value };
  }
  if (!result.ok) return { error: result.error, value };
  revalidateAccountScreens();
  return { notice: `Guardamos el presupuesto de ${result.categoryName}.` };
}

/** Removes one of the user's budgets; the category's spending stays. */
export async function removeBudget(
  _previous: RemoveBudgetState,
  formData: FormData,
): Promise<RemoveBudgetState> {
  const user = await getCurrentUser();
  let result;
  try {
    result = await deleteBudget(user.id, text(formData, "budgetId"));
  } catch (error) {
    console.error("Budget removal failed", error);
    return { error: BUDGET_MESSAGES.removeFailed };
  }
  if (!result.ok) return { error: result.error };
  revalidateAccountScreens();
  return { notice: `Quitamos el presupuesto de ${result.categoryName}.` };
}
