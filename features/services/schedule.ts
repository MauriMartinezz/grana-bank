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
