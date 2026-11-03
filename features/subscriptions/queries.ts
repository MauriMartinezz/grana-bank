import { nextDepositDate } from "@/features/deposits/schedule";
import { db } from "@/lib/db";

/** How many previous charges the detail shows. */
const PREVIOUS_CHARGES = 5;

/** The date an active subscription would be charged next, today included. */
export function nextChargeDate(billingDay: number, now: Date): Date {
  return nextDepositDate("MONTHLY", billingDay, now);
}

/**
 * The user's subscriptions: active ones first by their next charge, then the
 * cancelled ones, most recently cancelled first. `nextCharge` is null for a
 * cancelled one.
 */
export async function listSubscriptions(userId: string, now: Date) {
  const rows = await db.subscription.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const items = rows.map((row) => ({
    ...row,
    nextCharge: row.status === "ACTIVE" ? nextChargeDate(row.billingDay, now) : null,
  }));
  const active = items
    .filter((item) => item.nextCharge)
    .sort((a, b) => a.nextCharge!.getTime() - b.nextCharge!.getTime());
  const cancelled = items
    .filter((item) => !item.nextCharge)
    .sort((a, b) => (b.cancelledAt?.getTime() ?? 0) - (a.cancelledAt?.getTime() ?? 0));
  return [...active, ...cancelled];
}

/** One of the user's subscriptions with its card, or null for anyone else's. */
export function getSubscription(userId: string, subscriptionId: string) {
  return db.subscription.findFirst({
    where: { id: subscriptionId, userId },
    include: {
      card: {
        select: {
          id: true,
          brand: true,
          last4: true,
          account: { select: { currency: true, alias: true } },
        },
      },
    },
  });
}

/** The user's last subscription movements of a merchant, newest first. */
export function listPreviousCharges(userId: string, merchant: string) {
  return db.movement.findMany({
    where: { account: { userId }, type: "SUBSCRIPTION", counterparty: merchant },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: PREVIOUS_CHARGES,
    select: { id: true, amountCents: true, occurredAt: true, account: { select: { currency: true } } },
  });
}
