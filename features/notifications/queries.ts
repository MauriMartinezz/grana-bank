import { calendarToday } from "@/features/services/due-date";
import { db } from "@/lib/db";
import { buildFeed, MAX_NOTIFICATIONS, type Notification } from "./feed";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
/** The longest reminder: bills due further away cannot remind yet. */
const LONGEST_REMINDER_DAYS = 7;

/** The user's notifications of the last 30 days, newest first, every source scoped to them. */
export async function listNotifications(userId: string, now: Date): Promise<Notification[]> {
  const since = new Date(now.getTime() - WINDOW_MS);
  const today = calendarToday(now);
  const horizon = new Date(today.getTime() + LONGEST_REMINDER_DAYS * 24 * 60 * 60 * 1000);

  const [user, movements, exchanges, failedBills, reminderBills] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { notificationsSeenAt: true } }),
    db.movement.findMany({
      where: {
        account: { userId },
        type: { not: "EXCHANGE" },
        occurredAt: { gte: since, lte: now },
      },
      orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
      take: MAX_NOTIFICATIONS,
      select: {
        id: true,
        type: true,
        counterparty: true,
        amountCents: true,
        occurredAt: true,
        account: { select: { currency: true } },
      },
    }),
    db.exchange.findMany({
      where: { userId, createdAt: { gte: since, lte: now } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: MAX_NOTIFICATIONS,
      select: {
        id: true,
        direction: true,
        usdCents: true,
        arsCents: true,
        createdAt: true,
        movements: { where: { account: { currency: "USD" } }, select: { id: true }, take: 1 },
      },
    }),
    db.serviceBill.findMany({
      where: { status: "PENDING", failedAt: { gte: since }, adhesion: { userId } },
      select: {
        id: true,
        period: true,
        failureReason: true,
        failedAt: true,
        adhesion: { select: { nickname: true } },
      },
    }),
    db.serviceBill.findMany({
      where: {
        status: "PENDING",
        dueDate: { gte: today, lte: horizon },
        adhesion: { userId, reminderDays: { not: null } },
      },
      select: {
        id: true,
        period: true,
        amountCents: true,
        currency: true,
        dueDate: true,
        adhesion: { select: { nickname: true, reminderDays: true } },
      },
    }),
  ]);

  return buildFeed(
    {
      movements: movements.map(({ account, ...m }) => ({ ...m, currency: account.currency })),
      exchanges: exchanges.map(({ movements: sides, ...e }) => ({
        ...e,
        movementId: sides[0]?.id ?? null,
      })),
      failedBills: failedBills.map(({ adhesion, ...bill }) => ({ ...bill, nickname: adhesion.nickname })),
      reminderBills: reminderBills.map(({ adhesion, ...bill }) => ({
        ...bill,
        nickname: adhesion.nickname,
        reminderDays: adhesion.reminderDays ?? 0,
      })),
    },
    user?.notificationsSeenAt ?? null,
    now,
  );
}

/** How many notifications arrived since the user last opened the screen. */
export async function countUnreadNotifications(userId: string, now: Date) {
  return (await listNotifications(userId, now)).filter((item) => item.unread).length;
}

export async function markNotificationsSeen(userId: string, now: Date) {
  await db.user.update({ where: { id: userId }, data: { notificationsSeenAt: now } });
}
