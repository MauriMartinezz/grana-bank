/**
 * Calendar dates of service bills. A due date is stored as a date without
 * time (a UTC midnight once read), and "today" is the calendar date in
 * Buenos Aires, so both compare as plain dates.
 */

const TIME_ZONE = "America/Argentina/Buenos_Aires";
const DAY_MS = 24 * 60 * 60 * 1000;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** The calendar date in Buenos Aires at `now`, with the month from 1 to 12. */
export function buenosAiresDate(now: Date): { year: number; month: number; day: number } {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

/** Whole days from today in Buenos Aires to the due date: 0 is today. */
export function daysUntil(dueDate: Date, now: Date): number {
  const { year, month, day } = buenosAiresDate(now);
  return Math.round((dueDate.getTime() - Date.UTC(year, month - 1, day)) / DAY_MS);
}

/** `Vence en 7 días`, `Vence mañana`, `Vence hoy` or `Vencida`. */
export function dueLabel(dueDate: Date, now: Date): string {
  const days = daysUntil(dueDate, now);
  if (days < 0) return "Vencida";
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence en ${days} días`;
}

// UTC, because the stored date is a UTC midnight: Buenos Aires time would
// show the day before.
const dueDateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** A due date as `10 de noviembre de 2026`. */
export function formatDueDate(date: Date): string {
  return dueDateFormatter.format(date);
}

/** Today in Buenos Aires as the UTC midnight a date column reads back as. */
export function calendarToday(now: Date): Date {
  const { year, month, day } = buenosAiresDate(now);
  return new Date(Date.UTC(year, month - 1, day));
}
