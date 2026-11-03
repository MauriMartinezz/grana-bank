import { formatDate } from "@/lib/format";
import { addDays, dayKey } from "./day";

export type DayGroup<T> = {
  /** The Buenos Aires day, `YYYY-MM-DD`; stable as a React key. */
  day: string;
  /** "Hoy", "Ayer", `30 de octubre`, or `31 de diciembre de 2025`. */
  label: string;
  items: T[];
};

const dayMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Argentina/Buenos_Aires",
});

function dayLabel(date: Date, day: string, today: string): string {
  if (day === today) return "Hoy";
  if (day === addDays(today, -1)) return "Ayer";
  return day.slice(0, 4) === today.slice(0, 4)
    ? dayMonthFormatter.format(date)
    : formatDate(date);
}

/**
 * Groups items by their Buenos Aires day. Groups follow the order in which
 * each day first appears, and rows keep their order inside a group, so a list
 * sorted newest first stays sorted.
 */
export function groupByDay<T extends { occurredAt: Date }>(
  items: readonly T[],
  now: Date,
): DayGroup<T>[] {
  const today = dayKey(now);
  const groups = new Map<string, DayGroup<T>>();
  for (const item of items) {
    const day = dayKey(item.occurredAt);
    let group = groups.get(day);
    if (!group) {
      group = { day, label: dayLabel(item.occurredAt, day, today), items: [] };
      groups.set(day, group);
    }
    group.items.push(item);
  }
  return [...groups.values()];
}
