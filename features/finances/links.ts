import { REST_KEY, type SpendingSegment } from "./chart";

/** What the Finanzas page keeps in its links: the account and the month. */
export type FinancesPage = { cuenta: string; mes: string };

export function financesHref({ cuenta, mes }: FinancesPage): string {
  return `/finanzas?cuenta=${cuenta}&mes=${mes}`;
}

/** The id of a group's row, so a link can scroll to it. */
export function groupAnchor(groupKey: string): string {
  return `categoria-${encodeURIComponent(groupKey)}`;
}

/**
 * Opens the segment's category on the same account and month (`categoria`)
 * and scrolls to it; Resto scrolls to the first of its groups.
 */
export function segmentHref(page: FinancesPage, segment: SpendingSegment): string {
  const anchor = groupAnchor(segment.groupKeys[0] ?? segment.key);
  return `${financesHref(page)}&categoria=${encodeURIComponent(segment.key)}#${anchor}`;
}

/**
 * The groups to render open for `?categoria=`: that group, or every group
 * folded into Resto. Anything else opens none.
 */
export function openGroupKeys(
  categoria: string | string[] | undefined,
  segments: readonly SpendingSegment[],
  groupKeys: readonly string[],
): Set<string> {
  if (typeof categoria !== "string") return new Set();
  if (categoria === REST_KEY) {
    return new Set(segments.find((segment) => segment.key === REST_KEY)?.groupKeys ?? []);
  }
  return groupKeys.includes(categoria) ? new Set([categoria]) : new Set();
}
