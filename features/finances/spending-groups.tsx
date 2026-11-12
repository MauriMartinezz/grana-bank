import Link from "next/link";
import type { Currency } from "@/generated/prisma/client";
import { MOVEMENT_TYPE_STYLES } from "@/features/movements/movement-type";
import { formatAmount, formatMoney } from "@/lib/format";
import { BudgetEditor } from "./budget-forms";
import type { listMonthMovements } from "./queries";
import {
  budgetStatusLabel,
  type BudgetStatus,
  type ConversionGroup,
  type SpendingGroup,
} from "./summary";

export type SpendingMovement = Awaited<ReturnType<typeof listMonthMovements>>[number];

const dayFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});

// Over budget borrows the app's warning look (the "Vence pronto" badge).
const STATUS_CLASS: Record<BudgetStatus["kind"], string> = {
  available: "bg-garnet-soft text-garnet",
  over: "bg-yellow-soft text-ink",
};
const BAR_CLASS: Record<BudgetStatus["kind"], string> = {
  available: "bg-garnet-fill",
  over: "bg-yellow",
};

/** A CSS bar; the numbers next to it carry the same information. */
export function Bar({ percent, className }: { percent: number; className: string }) {
  return (
    <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-shade/10">
      <span
        className={`block h-full rounded-full ${className}`}
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </span>
  );
}

/** How much of a budget is spent, 0 to 100 and more when passed. */
export function budgetPercent(spentCents: bigint, budgetCents: bigint): number {
  return Number((spentCents * BigInt(100)) / budgetCents);
}

export function BudgetStatusBadge({ status, currency }: { status: BudgetStatus; currency: Currency }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[status.kind]}`}>
      {budgetStatusLabel(status, currency)}
    </span>
  );
}

function movementsLabel(count: number) {
  return count === 1 ? "1 movimiento" : `${count} movimientos`;
}

function GroupMovements({ movements }: { movements: SpendingMovement[] }) {
  if (movements.length === 0) {
    return <p className="text-sm text-muted">No hay gastos en esta categoría este mes.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-line">
      {movements.map((movement) => {
        const { label } = MOVEMENT_TYPE_STYLES[movement.type];
        return (
          <li key={movement.id}>
            <Link href={`/movimientos/${movement.id}`} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{movement.counterparty}</span>
                <span className="block text-xs text-muted">
                  {dayFormatter.format(movement.occurredAt)} · {label}
                </span>
              </span>
              <span className="text-sm font-semibold">
                {formatMoney(movement.amountCents, movement.account.currency)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** One category of the month: opens to show its budget and its movements. */
function GroupRow({ group, currency }: { group: SpendingGroup<SpendingMovement>; currency: Currency }) {
  const { budget } = group;
  return (
    <li>
      <details className="rounded-2xl bg-surface">
        <summary className="flex cursor-pointer list-none flex-col gap-2 p-4">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate font-medium">{group.name}</span>
            <span className="font-semibold">{formatMoney(group.totalCents, currency)}</span>
          </span>
          <span className="text-xs text-muted">
            {movementsLabel(group.count)} · {group.percent}% del mes
          </span>
          <Bar percent={group.percent} className="bg-garnet-fill" />
          {budget && (
            <span className="mt-1 flex flex-col gap-2">
              <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <span>
                  Gastaste {formatMoney(group.totalCents, currency)} de{" "}
                  {formatMoney(budget.amountCents, currency)}
                </span>
                <BudgetStatusBadge status={budget.status} currency={currency} />
              </span>
              <Bar
                percent={budgetPercent(group.totalCents, budget.amountCents)}
                className={BAR_CLASS[budget.status.kind]}
              />
            </span>
          )}
        </summary>
        <div className="flex flex-col gap-4 border-t border-line p-4">
          {group.categoryId ? (
            <BudgetEditor
              // A new key after a change resets the input to the saved amount.
              key={`${group.categoryId}:${budget?.amountCents ?? "none"}`}
              categoryId={group.categoryId}
              categoryName={group.name}
              currency={currency}
              budget={budget && { id: budget.id, amount: formatAmount(budget.amountCents) }}
            />
          ) : (
            <p className="text-sm text-muted">
              Para ordenar estos gastos, elegí una categoría desde el detalle de cada movimiento.
            </p>
          )}
          <GroupMovements movements={group.movements} />
        </div>
      </details>
    </li>
  );
}

export function SpendingGroups({
  groups,
  currency,
}: {
  groups: SpendingGroup<SpendingMovement>[];
  currency: Currency;
}) {
  return (
    <ul aria-label="Gastos por categoría" className="flex flex-col gap-3">
      {groups.map((group) => (
        <GroupRow key={group.key} group={group} currency={currency} />
      ))}
    </ul>
  );
}

/**
 * Dollar buys and sells, apart from gastos and ingresos: under the category
 * the user gave them (for example "Ahorro"), otherwise under "Conversión".
 */
export function ConversionGroups({ groups }: { groups: ConversionGroup<SpendingMovement>[] }) {
  return (
    <ul aria-label="Conversiones por categoría" className="flex flex-col gap-3">
      {groups.map((group) => (
        <li key={group.key}>
          <details className="rounded-2xl bg-surface">
            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 p-4">
              <span className="truncate font-medium">{group.name}</span>
              <span className="text-xs text-muted">{movementsLabel(group.count)}</span>
            </summary>
            <div className="border-t border-line px-4">
              <GroupMovements movements={group.movements} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
