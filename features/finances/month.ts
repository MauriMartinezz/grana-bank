import { dayKey, startOfDay } from "@/features/movements/day";

// Calendar months as `YYYY-MM` strings, in Buenos Aires time like the days in
// features/movements/day.ts, so a payment at 23:59 on the last day there
// never moves to the next month.
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

type UrlParam = string | string[] | undefined;

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** The Buenos Aires month of an instant: `2026-11`. */
export function currentMonth(now: Date): string {
  return dayKey(now).slice(0, 7);
}

/**
 * The month of `?mes=`. The URL is user input: anything that is not a
 * `YYYY-MM` month up to the current one falls back to the current month.
 */
export function parseMonth(param: UrlParam, now: Date): string {
  const value = Array.isArray(param) ? param[0] : param;
  const current = currentMonth(now);
  // `YYYY-MM` strings compare in calendar order.
  return value && MONTH.test(value) && value <= current ? value : current;
}

/** Calendar arithmetic on a month: `addMonths("2026-01", -1)` is `2025-12`. */
export function addMonths(month: string, months: number): string {
  const [year, number] = month.split("-").map(Number);
  const index = year * 12 + (number - 1) + months;
  const nextYear = Math.floor(index / 12);
  return `${String(nextYear).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** From midnight of the 1st to the midnight that starts the next month, in Buenos Aires. */
export function monthRange(month: string): { gte: Date; lt: Date } {
  return { gte: startOfDay(`${month}-01`), lt: startOfDay(`${addMonths(month, 1)}-01`) };
}

/** `2026-11` as `Noviembre de 2026`. */
export function formatMonth(month: string): string {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, number - 1, 15);
  const label = monthFormatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
