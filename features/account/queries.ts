import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const WITH_CARDS = {
  cards: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] },
};

/** The user's account in one currency, or null when they have none in it. */
export function getAccount(userId: string, currency: Currency = "ARS") {
  return db.account.findUnique({
    where: { userId_currency: { userId, currency } },
    include: WITH_CARDS,
  });
}

/** Every account of the user, pesos first, each with its cards. */
export function listAccounts(userId: string) {
  return db.account.findMany({
    where: { userId },
    orderBy: { currency: "asc" },
    include: WITH_CARDS,
  });
}

export type AccountWithCards = Awaited<ReturnType<typeof listAccounts>>[number];
