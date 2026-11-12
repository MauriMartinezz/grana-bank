import { percentOf, UNCATEGORIZED_KEY, type SpendingSummary } from "./summary";

/** Categorical chart colors (`--color-chart-1` to `--color-chart-8` in app/globals.css). */
export const CHART_SLOTS = 8;
/** At most this many categories get their own color in the spending bar. */
export const MAX_SEGMENTS = 6;
export const REST_KEY = "resto";
// Not "Otros": that is one of the default category names.
export const REST_NAME = "Resto";
/** Below this width (% of the bar) a segment's share does not fit on it. */
const LABEL_MIN_WIDTH = 12;

const ZERO = BigInt(0);
/** Widths keep four decimals, computed with integers. */
const WIDTH_SCALE = 10_000;

/** A categorical slot (0-based), or one of the two neutral grays. */
export type ChartColor = number | "uncategorized" | "rest";

export type SpendingSegment = {
  /** The group key (category id or `sin-categoria`), or `resto`. */
  key: string;
  name: string;
  totalCents: bigint;
  /** Whole-number share, rounded like the group list. */
  percent: number;
  /** Exact share of the bar's width; the widths add up to 100. */
  width: number;
  color: ChartColor;
  /** The groups this segment stands for, in the group list's order. */
  groupKeys: string[];
  /** Whether the share fits printed on the segment. */
  showLabel: boolean;
};

type SegmentGroup = { key: string; categoryId: string | null; name: string; totalCents: bigint };

function exactPercent(part: bigint, total: bigint, scale: number): number {
  return Number((part * BigInt(100 * scale)) / total) / scale;
}

/**
 * Splits a month's spending for the segmented bar. Colors follow the
 * category, never its rank: the slot is the category's position in
 * `categoryOrder` (the user's categories, oldest first). The first
 * `MAX_SEGMENTS` categories in that order with spending get their own color;
 * "Sin categoría" goes in gray after them, and every other category with
 * spending folds into one gray "Resto" segment at the end.
 */
export function buildSpendingSegments(
  summary: Pick<SpendingSummary<unknown>, "totalCents"> & { groups: readonly SegmentGroup[] },
  categoryOrder: readonly string[],
): SpendingSegment[] {
  const { totalCents } = summary;
  if (totalCents === ZERO) return [];
  const spent = summary.groups.filter((group) => group.totalCents > ZERO);

  const own: { group: SegmentGroup; slot: number }[] = [];
  for (const group of spent) {
    if (!group.categoryId) continue;
    const slot = categoryOrder.indexOf(group.categoryId);
    if (slot >= 0 && slot < CHART_SLOTS) own.push({ group, slot });
  }
  own.sort((a, b) => a.slot - b.slot);
  const colored = own.slice(0, MAX_SEGMENTS);
  const coloredKeys = new Set(colored.map(({ group }) => group.key));

  type Part = Omit<SpendingSegment, "percent" | "width" | "showLabel">;
  const parts: Part[] = colored.map(({ group, slot }) => ({
    key: group.key,
    name: group.name,
    totalCents: group.totalCents,
    color: slot,
    groupKeys: [group.key],
  }));
  const uncategorized = spent.find((group) => group.key === UNCATEGORIZED_KEY);
  if (uncategorized) {
    parts.push({
      key: uncategorized.key,
      name: uncategorized.name,
      totalCents: uncategorized.totalCents,
      color: "uncategorized",
      groupKeys: [uncategorized.key],
    });
  }
  const rest = spent.filter((group) => group.categoryId && !coloredKeys.has(group.key));
  if (rest.length > 0) {
    parts.push({
      key: REST_KEY,
      name: REST_NAME,
      totalCents: rest.reduce((total, group) => total + group.totalCents, ZERO),
      color: "rest",
      groupKeys: rest.map((group) => group.key),
    });
  }

  // Each width is floored; the last one takes what is left so the bar is full.
  let used = 0;
  return parts.map((part, index) => {
    const width =
      index === parts.length - 1
        ? Math.round((100 - used) * WIDTH_SCALE) / WIDTH_SCALE
        : exactPercent(part.totalCents, totalCents, WIDTH_SCALE);
    used += width;
    return {
      ...part,
      percent: percentOf(part.totalCents, totalCents),
      width,
      showLabel: width >= LABEL_MIN_WIDTH,
    };
  });
}

export type BudgetProgress = {
  /** Spent within the budget, as % of the bar. */
  withinPercent: number;
  /** Spent beyond the budget, as % of the bar. */
  excessPercent: number;
  /** Where the budget ends when passed, as % of the bar; null otherwise. */
  markerPercent: number | null;
};

/**
 * The geometry of a budget progress bar, whose full width is the budget or
 * what was spent, whichever is larger. `budgetCents` is always positive.
 */
export function budgetProgress(spentCents: bigint, budgetCents: bigint): BudgetProgress {
  if (spentCents <= budgetCents) {
    return {
      withinPercent: exactPercent(spentCents, budgetCents, WIDTH_SCALE),
      excessPercent: 0,
      markerPercent: null,
    };
  }
  const within = exactPercent(budgetCents, spentCents, WIDTH_SCALE);
  return {
    withinPercent: within,
    excessPercent: Math.round((100 - within) * WIDTH_SCALE) / WIDTH_SCALE,
    markerPercent: within,
  };
}
