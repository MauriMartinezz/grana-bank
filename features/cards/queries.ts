import { db } from "@/lib/db";

/**
 * The user's accounts, pesos first, each with its cards in the order they
 * were added. Only the card face is selected.
 */
export function listCardsByAccount(userId: string) {
  return db.account.findMany({
    where: { userId },
    orderBy: { currency: "asc" },
    select: {
      id: true,
      currency: true,
      alias: true,
      cards: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, brand: true, last4: true, holder: true, expiry: true },
      },
    },
  });
}

export type AccountCards = Awaited<ReturnType<typeof listCardsByAccount>>[number];

/** The accounts a card can be linked to, for the account selector. */
export function listCardAccounts(userId: string) {
  return db.account.findMany({
    where: { userId },
    orderBy: { currency: "asc" },
    select: { id: true, currency: true, alias: true },
  });
}

export type CardAccount = Awaited<ReturnType<typeof listCardAccounts>>[number];

/**
 * One card of the user: its face, when it was added and its account. Null for
 * an unknown id or a card of another user.
 */
export function getOwnCard(userId: string, cardId: string) {
  return db.card.findFirst({
    where: { id: cardId, account: { userId } },
    select: {
      id: true,
      brand: true,
      last4: true,
      holder: true,
      expiry: true,
      createdAt: true,
      account: { select: { currency: true, alias: true } },
    },
  });
}

export type OwnCard = NonNullable<Awaited<ReturnType<typeof getOwnCard>>>;
