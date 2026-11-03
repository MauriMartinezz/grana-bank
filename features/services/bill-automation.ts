/**
 * What happens to a pending bill without the user, in words for the screens.
 * Pure, so the list, the service and the bill say the same thing.
 */
import { BRAND_NAMES } from "@/features/cards/validation";
import type { CardBrand, ScheduledPaymentFailure } from "@/generated/prisma/client";
import { formatDueDate } from "./due-date";

type CardFace = { brand: CardBrand; last4: string };

export type AutomatedBill = {
  scheduledFor: Date | null;
  scheduledCard: CardFace | null;
  failureReason: ScheduledPaymentFailure | null;
};

export type BillAutomation =
  | { kind: "failed"; text: string }
  | { kind: "scheduled"; text: string }
  | { kind: "auto-debit"; text: string };

const FAILURE_TEXT: Record<ScheduledPaymentFailure, string> = {
  INSUFFICIENT_FUNDS: "No se pudo pagar: no había saldo suficiente",
  CARD_UNAVAILABLE: "No se pudo pagar: la tarjeta ya no está disponible",
};

export function cardFace(card: CardFace) {
  return `${BRAND_NAMES[card.brand]} •••• ${card.last4}`;
}

/** The failure first, then a one-off schedule, then the automatic debit. */
export function billAutomation(
  bill: AutomatedBill,
  autoDebitCard: CardFace | null,
): BillAutomation | null {
  if (bill.failureReason) return { kind: "failed", text: FAILURE_TEXT[bill.failureReason] };
  if (bill.scheduledFor) {
    const card = bill.scheduledCard ? ` con ${cardFace(bill.scheduledCard)}` : "";
    return {
      kind: "scheduled",
      text: `Pago programado para el ${formatDueDate(bill.scheduledFor)}${card}`,
    };
  }
  if (autoDebitCard) {
    return { kind: "auto-debit", text: `Débito automático con ${cardFace(autoDebitCard)}` };
  }
  return null;
}
