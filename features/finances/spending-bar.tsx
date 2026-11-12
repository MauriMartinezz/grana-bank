import Link from "next/link";
import type { Currency } from "@/generated/prisma/client";
import { formatMoney } from "@/lib/format";
import { budgetProgress, type ChartColor, type SpendingSegment } from "./chart";
import { segmentHref, type FinancesPage } from "./links";

// Whole class names, so Tailwind finds them; slots are 0-based.
const COLOR_CLASS: Record<string, string> = {
  0: "bg-chart-1",
  1: "bg-chart-2",
  2: "bg-chart-3",
  3: "bg-chart-4",
  4: "bg-chart-5",
  5: "bg-chart-6",
  6: "bg-chart-7",
  7: "bg-chart-8",
  uncategorized: "bg-chart-uncategorized",
  rest: "bg-chart-rest",
};

function colorClass(color: ChartColor) {
  return COLOR_CLASS[String(color)];
}

/**
 * The month's spending as one segmented bar: each segment links to its
 * category's group (`?categoria=`), with its share printed where it fits.
 * The legend names the segments; the group list below carries every figure.
 */
export function SpendingBar({
  segments,
  currency,
  page,
}: {
  segments: SpendingSegment[];
  currency: Currency;
  page: FinancesPage;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <ul aria-label="Gastos del mes por categoría" className="flex h-7 gap-0.5">
        {segments.map((segment) => {
          const description = `${segment.name}: ${formatMoney(segment.totalCents, currency)}, ${segment.percent}%`;
          return (
            <li key={segment.key} className="flex min-w-0" style={{ flex: `${segment.width} 1 0%` }}>
              <Link
                href={segmentHref(page, segment)}
                aria-label={description}
                title={description}
                className={`flex w-full items-center rounded px-1.5 text-xs font-semibold whitespace-nowrap text-white transition hover:brightness-110 ${colorClass(segment.color)}`}
              >
                {segment.showLabel && <span aria-hidden="true">{segment.percent}%</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <ul aria-label="Referencias" className="flex flex-wrap gap-x-4 gap-y-2">
        {segments.map((segment) => (
          <li key={segment.key}>
            <Link href={segmentHref(page, segment)} className="flex items-center gap-2 text-sm text-ink">
              <span aria-hidden="true" className={`size-3 shrink-0 rounded-sm ${colorClass(segment.color)}`} />
              {segment.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Spent against a budget: the bar spans the budget or what was spent,
 * whichever is larger; olive up to the budget, ochre past it, and a mark
 * where the budget ends. The text next to it carries the same figures.
 */
export function BudgetProgressBar({ spentCents, budgetCents }: { spentCents: bigint; budgetCents: bigint }) {
  const { withinPercent, excessPercent, markerPercent } = budgetProgress(spentCents, budgetCents);
  return (
    <span aria-hidden="true" className="relative block">
      <span className="flex h-2 overflow-hidden rounded-full bg-shade/10">
        <span
          className={`block h-full bg-garnet-fill ${excessPercent > 0 ? "rounded-l-full" : "rounded-full"}`}
          style={{ width: `${withinPercent}%` }}
        />
        {excessPercent > 0 && (
          <span className="block h-full rounded-r-full bg-yellow" style={{ width: `${excessPercent}%` }} />
        )}
      </span>
      {markerPercent !== null && (
        <span
          className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${markerPercent}%` }}
        />
      )}
    </span>
  );
}
