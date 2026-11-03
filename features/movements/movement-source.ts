import { ACCOUNT_LABELS } from "@/features/cards/account-label";
import type { Currency } from "@/generated/prisma/enums";

type MovementSource = {
  account: { currency: Currency };
  card: { last4: string } | null;
};

/** Where the money went through: the card when there is one, else the account. */
export function movementSource({ account, card }: MovementSource) {
  return card ? `Tarjeta terminada en ${card.last4}` : ACCOUNT_LABELS[account.currency];
}
