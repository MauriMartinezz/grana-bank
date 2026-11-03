import type { Currency, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { COMPANY_INFO, type ServiceCompany } from "./companies";

export type PayBillError =
  | "BILL_NOT_FOUND"
  | "ALREADY_PAID"
  | "CARD_NOT_FOUND"
  | "CURRENCY_MISMATCH"
  | "INSUFFICIENT_FUNDS"
  | "IDEMPOTENCY_MISMATCH";

export type PayBillResult =
  | { ok: true; paymentId: string; movementId: string }
  | { ok: false; error: PayBillError };

export type PayBillRequest = {
  userId: string;
  billId: string;
  /** A card of the user's account in the bill's currency. */
  cardId: string;
  /**
   * Same key, same payment: a repeated request returns the first result, and
   * the same key with another bill or card is rejected.
   */
  idempotencyKey: string;
};

/**
 * The account behind a card, when the card belongs to the user and its
 * account holds `currency`. Same checks as `resolvePesoCard` in top-ups, for
 * any currency, shared by the form check and the payment itself.
 */
export async function resolvePaymentCard(
  client: Prisma.TransactionClient,
  userId: string,
  cardId: string,
  currency: Currency,
): Promise<
  { ok: true; accountId: string } | { ok: false; error: "CARD_NOT_FOUND" | "CURRENCY_MISMATCH" }
> {
  const card = await client.card.findFirst({
    where: { id: cardId, account: { userId } },
    select: { accountId: true, account: { select: { currency: true } } },
  });
  if (!card) return { ok: false, error: "CARD_NOT_FOUND" };
  if (card.account.currency !== currency) return { ok: false, error: "CURRENCY_MISMATCH" };
  return { ok: true, accountId: card.accountId };
}

/** The movement name: `Pago Edesur · Luz depto`. */
export function counterpartyFor(company: ServiceCompany, nickname: string) {
  return `Pago ${COMPANY_INFO[company].name} · ${nickname}`;
}

export function referenceFor(paymentNumber: number) {
  return `SV-${String(paymentNumber).padStart(6, "0")}`;
}

// The raw queries return BIGINT columns as bigint and enums as text.
type LockedAccount = { id: string; balanceCents: bigint };
type LockedBill = { id: string; status: "PENDING" | "PAID" };

/**
 * Pays a service bill from a card of the bill's currency, in one database
 * transaction.
 *
 * The paying account row is locked first and the bill row second, always in
 * that order, so concurrent payments of the same bill or from the same
 * account run one after another: the balance never goes negative and a bill
 * is paid once. The unique bill index on payments is the last guard.
 */
export async function payBill({
  userId,
  billId,
  cardId,
  idempotencyKey,
}: PayBillRequest): Promise<PayBillResult> {
  return db.$transaction(async (tx) => {
    // A bill's owner, amount and currency and a card's account never change,
    // so reading them before the locks is safe; the status and the balance
    // are only read under the locks below.
    const bill = await tx.serviceBill.findFirst({
      where: { id: billId, adhesion: { userId } },
      select: {
        id: true,
        amountCents: true,
        currency: true,
        adhesion: { select: { company: true, nickname: true } },
      },
    });
    if (!bill) return { ok: false, error: "BILL_NOT_FOUND" };
    const card = await resolvePaymentCard(tx, userId, cardId, bill.currency);
    if (!card.ok) return card;
    const { accountId } = card;

    const lockedAccounts = await tx.$queryRaw<LockedAccount[]>`
      SELECT "id", "saldo_centavos" AS "balanceCents" FROM "cuentas"
      WHERE "id" = ${accountId}
      ORDER BY "id"
      FOR UPDATE`;
    const account = lockedAccounts[0];
    if (!account) return { ok: false, error: "CARD_NOT_FOUND" };
    const lockedBills = await tx.$queryRaw<LockedBill[]>`
      SELECT "id", "estado"::text AS "status" FROM "facturas_servicio"
      WHERE "id" = ${billId}
      ORDER BY "id"
      FOR UPDATE`;
    const locked = lockedBills[0];
    if (!locked) return { ok: false, error: "BILL_NOT_FOUND" };

    // Checked after the locks, so a concurrent duplicate sees the first commit.
    const existing = await tx.servicePayment.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: { id: true, billId: true, cardId: true, movements: { select: { id: true } } },
    });
    if (existing) {
      const movement = existing.movements[0];
      // A key belongs to one confirmation: replaying it with other values
      // must not report success for a payment that never happened.
      return existing.billId === billId && existing.cardId === cardId && movement
        ? { ok: true, paymentId: existing.id, movementId: movement.id }
        : { ok: false, error: "IDEMPOTENCY_MISMATCH" };
    }

    if (locked.status !== "PENDING") return { ok: false, error: "ALREADY_PAID" };
    if (account.balanceCents < bill.amountCents) return { ok: false, error: "INSUFFICIENT_FUNDS" };

    await tx.account.update({
      where: { id: accountId },
      data: { balanceCents: { decrement: bill.amountCents } },
    });
    const payment = await tx.servicePayment.create({
      data: {
        userId,
        billId,
        accountId,
        cardId,
        amountCents: bill.amountCents,
        idempotencyKey,
      },
    });
    await tx.serviceBill.update({
      where: { id: billId },
      data: { status: "PAID", paidAt: payment.createdAt },
    });
    const movement = await tx.movement.create({
      data: {
        accountId,
        cardId,
        servicePaymentId: payment.id,
        type: "SERVICE_PAYMENT",
        counterparty: counterpartyFor(bill.adhesion.company, bill.adhesion.nickname),
        amountCents: bill.amountCents,
        reference: referenceFor(payment.number),
        occurredAt: payment.createdAt,
      },
    });

    return { ok: true, paymentId: payment.id, movementId: movement.id };
  });
}

/** The movement of an already used key, or null when it is unused. */
export async function findServicePaymentMovementByKey(userId: string, idempotencyKey: string) {
  const found = await db.servicePayment.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    select: { movements: { select: { id: true }, take: 1 } },
  });
  return found?.movements[0]?.id ?? null;
}
