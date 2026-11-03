import { cardOption } from "@/features/exchange/queries";
import { db } from "@/lib/db";

/** The user's SUBE cards, oldest first, so the list keeps its order. */
export function listSubeCards(userId: string) {
  return db.subeCard.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, number: true, nickname: true },
  });
}

/** One SUBE card, only when it belongs to the user. */
export function getSubeCard(userId: string, subeCardId: string) {
  return db.subeCard.findFirst({
    where: { id: subeCardId, userId },
    select: { id: true, number: true, nickname: true },
  });
}

/**
 * The peso account with its card options and balance, or null when the user
 * has no peso account. Top-ups only debit pesos.
 */
export async function getPesoPayment(userId: string) {
  const account = await db.account.findFirst({
    where: { userId, currency: "ARS" },
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

/** A card of the confirmation, only when it belongs to the user. */
export function getOwnedCard(userId: string, cardId: string) {
  return db.card.findFirst({
    where: { id: cardId, account: { userId } },
    include: {
      account: { select: { id: true, currency: true, alias: true, balanceCents: true } },
    },
  });
}

/** A movement of the user's top-up, with the top-up it belongs to. */
export function getTopUpReceipt(userId: string, movementId: string) {
  return db.movement.findFirst({
    where: { id: movementId, account: { userId }, topUpId: { not: null } },
    include: { topUp: true, card: { select: { brand: true, last4: true } } },
  });
}
