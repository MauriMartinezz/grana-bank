// Calendar days as `YYYY-MM-DD` strings, always in Buenos Aires time, so a
// movement at 23:59 there never lands on the next day because the server or
// the browser runs in UTC.
const TIME_ZONE = "America/Argentina/Buenos_Aires";

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// `en-CA` formats dates as `2026-11-03`.
const keyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

const wallClockFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

/** The Buenos Aires calendar day of an instant: `2026-11-03`. */
export function dayKey(date: Date): string {
  return keyFormatter.format(date);
}

/** Whether `value` is a real calendar day written as `YYYY-MM-DD`. */
export function isDayKey(value: string): boolean {
  const match = ISO_DAY.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function utcMidnight(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

/** Calendar arithmetic on a day key: `addDays("2026-03-01", -1)` is `2026-02-28`. */
export function addDays(key: string, days: number): string {
  const date = utcMidnight(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** How far Buenos Aires wall-clock time is ahead of UTC at an instant, in ms. */
function offsetAt(instant: Date): number {
  const parts = Object.fromEntries(
    wallClockFormatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const wallClock = new Date(0);
  wallClock.setUTCFullYear(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  wallClock.setUTCHours(Number(parts.hour), Number(parts.minute), Number(parts.second));
  return wallClock.getTime() - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Midnight in Buenos Aires at the start of a day, as an instant. */
export function startOfDay(key: string): Date {
  const guess = utcMidnight(key);
  const first = new Date(guess.getTime() - offsetAt(guess));
  // A second pass settles a day whose offset differs from the guess's.
  return new Date(guess.getTime() - offsetAt(first));
}
