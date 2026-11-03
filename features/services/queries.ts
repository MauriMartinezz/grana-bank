import { cardOption } from "@/features/exchange/queries";
import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { orderBills } from "./bills";

/** The user's adhesions, oldest first, each with its next pending bill. */
export function listAdhesions(userId: string) {
  return db.serviceAdhesion.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      company: true,
      nickname: true,
      bills: {
        where: { status: "PENDING" },
        orderBy: [{ dueDate: "asc" }, { id: "asc" }],
        take: 1,
        select: { id: true, period: true, amountCents: true, currency: true, dueDate: true },
      },
    },
  });
}

/** One adhesion with its bills in display order, only when it is the user's. */
export async function getAdhesion(userId: string, adhesionId: string) {
  const adhesion = await db.serviceAdhesion.findFirst({
    where: { id: adhesionId, userId },
    include: { bills: true },
  });
  return adhesion && { ...adhesion, bills: orderBills(adhesion.bills) };
}

/** One bill with its adhesion, only when it is the user's. */
export function getBill(userId: string, billId: string) {
  return db.serviceBill.findFirst({
    where: { id: billId, adhesion: { userId } },
    include: { adhesion: { select: { id: true, company: true, nickname: true } } },
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
      cards: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, brand: true, last4: true },
      },
    },
  });
  if (!account) return null;
  return {
    balanceCents: account.balanceCents,
    cards: account.cards.map((card) => cardOption({ ...card, account })),
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
