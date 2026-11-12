import type { Currency } from "@/generated/prisma/client";
import { CATEGORY_NOT_FOUND, isOwnCategory } from "@/features/categories/categories";
import { db } from "@/lib/db";

export const BUDGET_NOT_FOUND = "Este presupuesto ya no está disponible.";

export type BudgetResult = { ok: true; categoryName: string } | { ok: false; error: string };

/**
 * Sets, or changes, the monthly budget of one of the user's categories in a
 * currency. The category must be the user's own, so another user's category
 * id (and so their budget) is never touched.
 */
export async function setBudget(
  userId: string,
  categoryId: string,
  currency: Currency,
  amountCents: number,
): Promise<BudgetResult> {
  return db.$transaction(async (tx) => {
    if (!(await isOwnCategory(tx, userId, categoryId))) {
      return { ok: false, error: CATEGORY_NOT_FOUND };
    }
    // The unique index on (user, category, currency) keeps one per currency.
    const budget = await tx.budget.upsert({
      where: { userId_categoryId_currency: { userId, categoryId, currency } },
      create: { userId, categoryId, currency, amountCents },
      update: { amountCents },
      include: { category: { select: { name: true } } },
    });
    return { ok: true, categoryName: budget.category.name };
  });
}

/** Removes one of the user's budgets; another user's id removes nothing. */
export async function deleteBudget(userId: string, budgetId: string): Promise<BudgetResult> {
  return db.$transaction(async (tx) => {
    const budget = await tx.budget.findFirst({
      where: { id: budgetId, userId },
      include: { category: { select: { name: true } } },
    });
    if (!budget) return { ok: false, error: BUDGET_NOT_FOUND };
    const { count } = await tx.budget.deleteMany({ where: { id: budgetId, userId } });
    return count === 1
      ? { ok: true, categoryName: budget.category.name }
      : { ok: false, error: BUDGET_NOT_FOUND };
  });
}
