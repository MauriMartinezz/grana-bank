import type { Currency, MovementType } from "@/generated/prisma/client";
import { formatMoney } from "@/lib/format";
import { moneyFlow } from "./flow";

export const UNCATEGORIZED_KEY = "sin-categoria";
export const UNCATEGORIZED_NAME = "Sin categoría";
export const CONVERSION_KEY = "conversion";
export const CONVERSION_NAME = "Conversión";

const ZERO = BigInt(0);

export type BudgetStatus =
  | { kind: "available"; cents: bigint }
  | { kind: "over"; cents: bigint };

type SpendingMovement = {
  type: MovementType;
  amountCents: bigint;
  occurredAt: Date;
  category: { id: string; name: string } | null;
};

type BudgetInput = {
  id: string;
  categoryId: string;
  category: { name: string };
  amountCents: bigint;
};

export type SpendingGroup<T> = {
  /** The category id, or `sin-categoria`; stable as a React key. */
  key: string;
  categoryId: string | null;
  name: string;
  totalCents: bigint;
  /** Whole-number share of the month's spending, 0 to 100. */
  percent: number;
  count: number;
  /** Newest first. */
  movements: T[];
  budget: { id: string; amountCents: bigint; status: BudgetStatus } | null;
};

export type SpendingSummary<T> = {
  totalCents: bigint;
  groups: SpendingGroup<T>[];
  /** What the budgeted categories allow and spent; null without budgets. */
  budgeted: { budgetCents: bigint; spentCents: bigint } | null;
};


/** What is left of a budget, or by how much it was passed. Spending it all is still available. */
export function budgetStatus(spentCents: bigint, budgetCents: bigint): BudgetStatus {
  return spentCents > budgetCents
    ? { kind: "over", cents: spentCents - budgetCents }
    : { kind: "available", cents: budgetCents - spentCents };
}

export function budgetStatusLabel(status: BudgetStatus, currency: Currency): string {
  const amount = formatMoney(status.cents, currency);
  return status.kind === "over" ? `Te pasaste por ${amount}` : `Disponible ${amount}`;
}

function percentOf(part: bigint, total: bigint): number {
  if (total === ZERO) return 0;
  // Rounded half up with integers, so cents never go through floating point.
  return Number((part * BigInt(200) + total) / (total * BigInt(2)));
}

/**
 * Groups a month's expenses (see `moneyFlow`) by category, highest total first. Movements with
 * no category (or a deleted one) go under "Sin categoría". Budgeted
 * categories appear even with nothing spent.
 */
export function summarizeSpending<T extends SpendingMovement>(
  movements: readonly T[],
  budgets: readonly BudgetInput[],
): SpendingSummary<T> {
  const groups = new Map<string, SpendingGroup<T>>();
  const groupOf = (key: string, categoryId: string | null, name: string) => {
    let group = groups.get(key);
    if (!group) {
      group = { key, categoryId, name, totalCents: ZERO, percent: 0, count: 0, movements: [], budget: null };
      groups.set(key, group);
    }
    return group;
  };

  let totalCents = ZERO;
  for (const movement of movements) {
    if (moneyFlow(movement.type) !== "expense") continue;
    const group = movement.category
      ? groupOf(movement.category.id, movement.category.id, movement.category.name)
      : groupOf(UNCATEGORIZED_KEY, null, UNCATEGORIZED_NAME);
    group.totalCents += movement.amountCents;
    group.count += 1;
    group.movements.push(movement);
    totalCents += movement.amountCents;
  }

  let budgetCents = ZERO;
  let budgetedSpentCents = ZERO;
  for (const budget of budgets) {
    const group = groupOf(budget.categoryId, budget.categoryId, budget.category.name);
    group.budget = {
      id: budget.id,
      amountCents: budget.amountCents,
      status: budgetStatus(group.totalCents, budget.amountCents),
    };
    budgetCents += budget.amountCents;
    budgetedSpentCents += group.totalCents;
  }
  const budgeted = budgets.length > 0 ? { budgetCents, spentCents: budgetedSpentCents } : null;

  const sorted = [...groups.values()];
  for (const group of sorted) {
    group.percent = percentOf(group.totalCents, totalCents);
    group.movements.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }
  sorted.sort((a, b) =>
    a.totalCents === b.totalCents
      ? a.name.localeCompare(b.name, "es-AR")
      : a.totalCents > b.totalCents
        ? -1
        : 1,
  );

  return { totalCents, groups: sorted, budgeted };
}

export type ConversionGroup<T> = {
  /** The category id, or `conversion`; stable as a React key. */
  key: string;
  categoryId: string | null;
  name: string;
  count: number;
  /** Newest first. */
  movements: T[];
};

export type MonthSummary<T> = {
  incomeCents: bigint;
  /** Ingresos minus gastos; negative when more went out than came in. */
  balanceCents: bigint;
  expenses: SpendingSummary<T>;
  conversions: ConversionGroup<T>[];
};

/**
 * Groups dollar buys and sells apart from income and expenses: under the
 * category the user gave them (for example "Ahorro"), otherwise under
 * "Conversión". Most movements first.
 */
function groupConversions<T extends SpendingMovement>(movements: readonly T[]): ConversionGroup<T>[] {
  const groups = new Map<string, ConversionGroup<T>>();
  for (const movement of movements) {
    if (moneyFlow(movement.type) !== "conversion") continue;
    const [key, categoryId, name] = movement.category
      ? [movement.category.id, movement.category.id, movement.category.name]
      : [CONVERSION_KEY, null, CONVERSION_NAME];
    let group = groups.get(key);
    if (!group) {
      group = { key, categoryId, name, count: 0, movements: [] };
      groups.set(key, group);
    }
    group.count += 1;
    group.movements.push(movement);
  }
  const sorted = [...groups.values()];
  for (const group of sorted) {
    group.movements.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  }
  return sorted.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es-AR"));
}

/** A month in one currency: ingresos, gastos by category and conversions, each apart. */
export function summarizeMonth<T extends SpendingMovement>(
  movements: readonly T[],
  budgets: readonly BudgetInput[],
): MonthSummary<T> {
  const expenses = summarizeSpending(movements, budgets);
  const incomeCents = movements
    .filter((movement) => moneyFlow(movement.type) === "income")
    .reduce((total, movement) => total + movement.amountCents, ZERO);
  return {
    incomeCents,
    balanceCents: incomeCents - expenses.totalCents,
    expenses,
    conversions: groupConversions(movements),
  };
}
