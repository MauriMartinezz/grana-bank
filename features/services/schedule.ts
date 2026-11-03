/**
 * When a bill is paid without the user: a one-off schedule on its date, or
 * else the adhesion's automatic debit on or after the due date. Pure, so the
 * processor, the payment under its locks and the screens agree.
 */

export type SchedulableBill = {
  dueDate: Date;
  scheduledFor: Date | null;
  scheduledCardId: string | null;
  failedAt: Date | null;
  adhesion: { autoDebitCardId: string | null };
};

export type ScheduledRun =
  | { due: false }
  | { due: true; cardId: string }
  /** Due today, but its card was removed. */
  | { due: true; cardId: null };

/** Whether the bill is paid on `today` (a UTC midnight) and with which card. */
export function scheduledRun(bill: SchedulableBill, today: Date): ScheduledRun {
  // A failed payment waits until the user schedules again.
  if (bill.failedAt) return { due: false };
  if (bill.scheduledFor) {
    return bill.scheduledFor.getTime() <= today.getTime()
      ? { due: true, cardId: bill.scheduledCardId }
      : { due: false };
  }
  const card = bill.adhesion.autoDebitCardId;
  return card && bill.dueDate.getTime() <= today.getTime() ? { due: true, cardId: card } : { due: false };
}

/** The idempotency key of the unattended payment of a bill: one per bill. */
export function scheduledPaymentKey(billId: string) {
  return `scheduled-${billId}`;
}

export const SCHEDULE_MESSAGES = {
  dateEmpty: "Elegí la fecha del pago.",
  dateInPast: "La fecha no puede ser anterior a hoy.",
} as const;

/** `2026-11-12` for a date input, from a UTC midnight. */
export function dateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The last day a bill can be scheduled for: its due date, or today when it is
 * already overdue.
 */
export function lastScheduleDay(dueDate: Date, today: Date): Date {
  return dueDate.getTime() < today.getTime() ? today : dueDate;
}

/**
 * A schedule date typed as `YYYY-MM-DD`, from today to `lastScheduleDay`,
 * as a UTC midnight. `tooLate` words the error with the formatted last day.
 */
export function parseScheduleDate(
  raw: string,
  dueDate: Date,
  today: Date,
  tooLate: (last: Date) => string,
): { ok: true; date: Date } | { ok: false; error: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return { ok: false, error: SCHEDULE_MESSAGES.dateEmpty };
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects dates such as 2026-02-31, which Date.UTC rolls over.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { ok: false, error: SCHEDULE_MESSAGES.dateEmpty };
  }
  if (date.getTime() < today.getTime()) return { ok: false, error: SCHEDULE_MESSAGES.dateInPast };
  const last = lastScheduleDay(dueDate, today);
  if (date.getTime() > last.getTime()) return { ok: false, error: tooLate(last) };
  return { ok: true, date };
}
