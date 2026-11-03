import type { CardBrand, Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";

const BRAND_NAMES: Record<CardBrand, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  AMEX: "American Express",
};

export type CardOption = { id: string; label: string; detail: string };

/** How a card reads in a selector: brand and last digits, then its account. */
export function cardOption(card: {
  id: string;
  brand: CardBrand;
  last4: string;
  account: { currency: Currency; alias: string };
}): CardOption {
  return {
    id: card.id,
    label: `${BRAND_NAMES[card.brand]} •••• ${card.last4}`,
    detail: `Cuenta en ${card.account.currency} · ${card.account.alias}`,
  };
}

/** The two cards of a confirmation, only when they belong to the user. */
export function getOwnedCards(userId: string, ids: string[]) {
  return db.card.findMany({
    where: { id: { in: ids }, account: { userId } },
    include: {
      account: { select: { id: true, currency: true, alias: true, balanceCents: true } },
    },
  });
}

/** A movement of the user's exchange, with the exchange it belongs to. */
export function getExchangeReceipt(userId: string, movementId: string) {
  return db.movement.findFirst({
    where: { id: movementId, account: { userId }, exchangeId: { not: null } },
    include: { exchange: true },
  });
}
