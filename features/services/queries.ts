import { defaultFirst } from "@/features/cards/default-card";
import { cardOption } from "@/features/exchange/queries";
import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { orderBills } from "./bills";

const CARD_FACE = { select: { id: true, brand: true, last4: true } } as const;

/** The user's adhesions, oldest first, each with its next pending bill. */
export function listAdhesions(userId: string) {
  return db.serviceAdhesion.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      company: true,
      nickname: true,
      autoDebitCard: CARD_FACE,
      bills: {
        where: { status: "PENDING" },
        orderBy: [{ dueDate: "asc" }, { id: "asc" }],
        take: 1,
        select: {
          id: true,
          period: true,
          amountCents: true,
          currency: true,
          dueDate: true,
          scheduledFor: true,
          scheduledCard: CARD_FACE,
          failureReason: true,
        },
      },
    },
  });
}

/** One adhesion with its bills in display order, only when it is the user's. */
export async function getAdhesion(userId: string, adhesionId: string) {
  const adhesion = await db.serviceAdhesion.findFirst({
    where: { id: adhesionId, userId },
    include: { bills: { include: { scheduledCard: CARD_FACE } }, autoDebitCard: CARD_FACE },
  });
  return adhesion && { ...adhesion, bills: orderBills(adhesion.bills) };
}

/** One bill with its adhesion, only when it is the user's. */
export function getBill(userId: string, billId: string) {
  return db.serviceBill.findFirst({
    where: { id: billId, adhesion: { userId } },
    include: {
      scheduledCard: CARD_FACE,
      adhesion: {
        select: {
          id: true,
          company: true,
          nickname: true,
          paymentNumber: true,
          autoDebitCard: CARD_FACE,
        },
      },
    },
  });
}

/** Pending bills whose scheduled or automatic payment failed, oldest due first. */
export function listFailedBills(userId: string) {
  return db.serviceBill.findMany({
    where: { status: "PENDING", failedAt: { not: null }, adhesion: { userId } },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    select: {
      id: true,
      period: true,
      failureReason: true,
      adhesion: { select: { id: true, nickname: true } },
    },
  });
}

export const UPCOMING_BILLS = 3;

/**
 * The next pending bills that nothing pays by itself: no one-off schedule and
 * no automatic debit. Home reminds them with `Vence en N días`.
 */
export function listUpcomingBills(userId: string) {
  return db.serviceBill.findMany({
    where: {
      status: "PENDING",
      scheduledFor: null,
      adhesion: { userId, autoDebitCardId: null },
    },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    take: UPCOMING_BILLS,
    select: {
      id: true,
      amountCents: true,
      currency: true,
      dueDate: true,
      adhesion: { select: { nickname: true, company: true } },
    },
  });
}

/**
 * The account in `currency` with its card options and balance, or null when
 * the user has no such account. A bill is paid from its own currency.
 */
export async function getPaymentCards(userId: string, currency: Currency) {
  const account = await db.account.findFirst({
    where: { userId, currency },
    select: {
      currency: true,
      alias: true,
      balanceCents: true,
      defaultCardId: true,
      cards: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, brand: true, last4: true },
      },
    },
  });
  if (!account) return null;
  // The default card first, so the picker preselects it.
  return {
    balanceCents: account.balanceCents,
    cards: defaultFirst(account.cards, account.defaultCardId).map((card) =>
      cardOption({ ...card, account }),
    ),
  };
}

/** A movement of the user's service payment, with the bill it paid. */
export function getServiceReceipt(userId: string, movementId: string) {
  return db.movement.findFirst({
    where: { id: movementId, account: { userId }, servicePaymentId: { not: null } },
    include: {
      servicePayment: { include: { bill: { include: { adhesion: true } } } },
      account: { select: { currency: true } },
    },
  });
}
