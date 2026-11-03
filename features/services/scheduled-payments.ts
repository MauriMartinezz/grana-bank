import type { ScheduledPaymentFailure } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { calendarToday } from "./due-date";
import { payBill, type PayBillError } from "./pay-bill";
import { scheduledPaymentKey, scheduledRun } from "./schedule";

export type ProcessSummary = { paid: number; failed: number };

const FAILURES: Partial<Record<PayBillError, ScheduledPaymentFailure>> = {
  INSUFFICIENT_FUNDS: "INSUFFICIENT_FUNDS",
  CARD_NOT_FOUND: "CARD_UNAVAILABLE",
  CURRENCY_MISMATCH: "CARD_UNAVAILABLE",
};

/** Marks a pending bill as failed, unless something changed it meanwhile. */
async function markFailed(billId: string, reason: ScheduledPaymentFailure, now: Date) {
  const { count } = await db.serviceBill.updateMany({
    where: { id: billId, status: "PENDING", failedAt: null },
    data: { failedAt: now, failureReason: reason },
  });
  return count === 1;
}

/**
 * Pays the bills due on the calendar day of `now` in Buenos Aires: one-off
 * schedules on their date and automatic debits on or after the due date.
 * Only `userId`'s bills when given (the demo button), every user's otherwise
 * (the cron).
 *
 * Each bill goes through `payBill` with one key per bill, so overlapping runs
 * pay it once and never overdraw. A payment without balance or without its
 * card ends as failed and is not retried until the user acts.
 */
export async function processScheduledPayments({
  now,
  userId,
}: {
  now: Date;
  userId?: string;
}): Promise<ProcessSummary> {
  const today = calendarToday(now);
  const bills = await db.serviceBill.findMany({
    where: {
      status: "PENDING",
      failedAt: null,
      adhesion: userId ? { userId } : {},
      OR: [
        { scheduledFor: { lte: today } },
        {
          scheduledFor: null,
          dueDate: { lte: today },
          adhesion: { autoDebitCardId: { not: null } },
        },
      ],
    },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    select: {
      id: true,
      dueDate: true,
      scheduledFor: true,
      scheduledCardId: true,
      failedAt: true,
      adhesion: { select: { userId: true, autoDebitCardId: true } },
    },
  });

  const summary: ProcessSummary = { paid: 0, failed: 0 };
  for (const bill of bills) {
    const run = scheduledRun(bill, today);
    if (!run.due) continue;
    try {
      if (run.cardId === null) {
        if (await markFailed(bill.id, "CARD_UNAVAILABLE", now)) summary.failed += 1;
        continue;
      }
      const result = await payBill({
        userId: bill.adhesion.userId,
        billId: bill.id,
        cardId: run.cardId,
        idempotencyKey: scheduledPaymentKey(bill.id),
        scheduledOn: today,
      });
      if (result.ok) {
        summary.paid += 1;
        continue;
      }
      // Already paid, cancelled or replayed by an overlapping run: nothing to do.
      const reason = FAILURES[result.error];
      if (reason && (await markFailed(bill.id, reason, now))) summary.failed += 1;
    } catch (error) {
      // One bill's failure must not stop the others; the next run retries it.
      console.error(`Scheduled payment of bill ${bill.id} failed`, error);
    }
  }
  return summary;
}
