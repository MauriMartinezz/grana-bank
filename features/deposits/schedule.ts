/**
 * Rules and texts of scheduled deposits, a demo: schedules are saved and
 * listed, but nothing deposits them. Pure, so the form checks the same rules.
 */
import { buenosAiresWeekday } from "@/features/promotions/filters";
import { buenosAiresDate } from "@/features/services/due-date";
import { parseAmountToCents } from "@/features/transfers/amount";
import { formatMoney } from "@/lib/format";
import { MAX_DEPOSIT_CENTS } from "./test-account";

export type DepositFrequency = "WEEKLY" | "MONTHLY";

export type DepositSchedule = {
  currency: "ARS" | "USD";
  amountCents: number;
  frequency: DepositFrequency;
  /** 1 (Monday) to 7 (Sunday) weekly, 1 to 31 monthly. */
  day: number;
};

export type DepositScheduleErrors = {
  currency?: string;
  amount?: string;
  frequency?: string;
  day?: string;
};

export const WEEKDAY_NAMES = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábados",
  "domingos",
] as const;

const DAY_ERRORS: Record<DepositFrequency, string> = {
  WEEKLY: "Elegí un día de la semana.",
  MONTHLY: "Elegí un día del 1 al 31.",
};

export function parseFrequency(value: string): DepositFrequency | null {
  return value === "WEEKLY" || value === "MONTHLY" ? value : null;
}

/**
 * A day that fits the frequency (1 to 7 weekly, 1 to 31 monthly), or null.
 * Shared by scheduled deposits and scheduled top-ups.
 */
export function parseScheduleDay(frequency: DepositFrequency | null, raw: string): number | null {
  if (!frequency || !/^\d{1,2}$/.test(raw)) return null;
  const day = Number(raw);
  const last = frequency === "WEEKLY" ? 7 : 31;
  return day >= 1 && day <= last ? day : null;
}

/** The day's error for a frequency. */
export function scheduleDayError(frequency: DepositFrequency) {
  return DAY_ERRORS[frequency];
}

export function validateDepositSchedule(input: {
  currency: string;
  amount: string;
  frequency: string;
  day: string;
}): { ok: true; schedule: DepositSchedule } | { ok: false; errors: DepositScheduleErrors } {
  const errors: DepositScheduleErrors = {};
  const currency = input.currency === "ARS" || input.currency === "USD" ? input.currency : null;
  if (!currency) errors.currency = "Elegí la cuenta.";

  const amountCents = input.amount.trim() ? parseAmountToCents(input.amount) : null;
  if (!input.amount.trim()) errors.amount = "Ingresá un monto.";
  else if (amountCents === null) errors.amount = "Ingresá un monto mayor a cero, con hasta 2 decimales.";
  else if (currency && amountCents > MAX_DEPOSIT_CENTS[currency]) {
    errors.amount = `Podés ingresar hasta ${formatMoney(MAX_DEPOSIT_CENTS[currency], currency)} por vez.`;
  }

  const frequency = parseFrequency(input.frequency);
  if (!frequency) errors.frequency = "Elegí cada cuánto.";

  const day = parseScheduleDay(frequency, input.day);
  if (frequency && day === null) errors.day = DAY_ERRORS[frequency];

  if (!currency || amountCents === null || !frequency || day === null || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, schedule: { currency, amountCents, frequency, day } };
}

/** `El día 15 de cada mes`, `Todos los lunes`. */
export function scheduleText(frequency: DepositFrequency, day: number) {
  return frequency === "WEEKLY"
    ? `Todos los ${WEEKDAY_NAMES[day - 1]}`
    : `El día ${day} de cada mes`;
}

function lastDayOf(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The next date it would deposit, today included, as a UTC midnight. */
export function nextDepositDate(frequency: DepositFrequency, day: number, now: Date): Date {
  const { year, month, day: today } = buenosAiresDate(now);
  if (frequency === "WEEKLY") {
    const ahead = (day - buenosAiresWeekday(now) + 7) % 7;
    return new Date(Date.UTC(year, month - 1, today + ahead));
  }
  const thisMonth = Math.min(day, lastDayOf(year, month));
  if (thisMonth >= today) return new Date(Date.UTC(year, month - 1, thisMonth));
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return new Date(Date.UTC(next.year, next.month - 1, Math.min(day, lastDayOf(next.year, next.month))));
}
