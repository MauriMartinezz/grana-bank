import type { Currency } from "@/generated/prisma/client";
import { defaultFirst } from "@/features/cards/default-card";
import { db } from "@/lib/db";

const WITH_CARDS = {
  cards: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
};

/** The account's cards with its default card first. */
function withDefaultFirst<T extends { cards: { id: string }[]; defaultCardId: string | null }>(
  account: T,
): T {
  return { ...account, cards: defaultFirst(account.cards, account.defaultCardId) };
}

/** The user's account in one currency, or null; its default card comes first. */
export async function getAccount(userId: string, currency: Currency = "ARS") {
  const account = await db.account.findUnique({
    where: { userId_currency: { userId, currency } },
    include: WITH_CARDS,
  });
  return account && withDefaultFirst(account);
}

/** Every account of the user, pesos first, each with its default card first. */
export async function listAccounts(userId: string) {
  const accounts = await db.account.findMany({
    where: { userId },
    orderBy: { currency: "asc" },
    include: WITH_CARDS,
  });
  return accounts.map(withDefaultFirst);
}

export type AccountWithCards = Awaited<ReturnType<typeof listAccounts>>[number];
