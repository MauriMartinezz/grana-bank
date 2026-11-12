import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { monthRange } from "./month";

/**
 * Every movement of the user in one currency and Buenos Aires month, newest
 * first: the summary splits them into ingresos, gastos and conversions.
 * Scoped by `account.userId` like features/movements/queries.ts, so another
 * user's movements never show up. The include matches the movement list's
 * rows (only the card's brand and last digits), plus the category.
 */
export function listMonthMovements(userId: string, currency: Currency, month: string) {
  return db.movement.findMany({
    where: {
      account: { userId, currency },
      occurredAt: monthRange(month),
    },
    orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
    include: {
      account: { select: { currency: true } },
      card: { select: { last4: true, brand: true } },
      category: { select: { id: true, name: true } },
    },
  });
}

/** The user's budgets in one currency, with their category's name. */
export function listBudgets(userId: string, currency: Currency) {
  return db.budget.findMany({
    where: { userId, currency },
    orderBy: [{ id: "asc" }],
    include: { category: { select: { id: true, name: true } } },
  });
}

/**
 * The user's category ids, oldest first: a category's position here picks its
 * chart color, so it keeps the same one every month and after a rename.
 */
export async function listCategoryOrder(userId: string): Promise<string[]> {
  const categories = await db.category.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return categories.map((category) => category.id);
}
