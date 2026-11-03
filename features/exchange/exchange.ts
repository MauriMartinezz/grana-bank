import type { Currency, ExchangeDirection, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ARS_PER_USD, isExchangeAmount, usdToArsCents } from "./rate";

export type ExchangeError =
  | "INVALID_AMOUNT"
  | "INSUFFICIENT_FUNDS"
  | "CARD_NOT_FOUND"
  | "CURRENCY_MISMATCH"
  | "IDEMPOTENCY_MISMATCH";

export type ExchangeResult =
  | { ok: true; exchangeId: string; movementId: string }
  | { ok: false; error: ExchangeError };

export type ExchangeRequest = {
  userId: string;
  direction: ExchangeDirection;
  /** Dollars bought or sold, in cents. */
  usdCents: number;
  /** The card whose account pays: pesos when buying, dollars when selling. */
  fromCardId: string;
  /** The card whose account is credited. */
  toCardId: string;
  /**
   * Same key, same exchange: a repeated request returns the first result,
   * and the same key with other values is rejected.
   */
  idempotencyKey: string;
};

/** The currency that leaves and the one that arrives, per direction. */
export const SIDES: Record<ExchangeDirection, { from: Currency; to: Currency }> = {
  BUY: { from: "ARS", to: "USD" },
  SELL: { from: "USD", to: "ARS" },
};

export const COUNTERPARTY: Record<ExchangeDirection, string> = {
  BUY: "Compra de dólares",
  SELL: "Venta de dólares",
};

type CardAccount = { id: string; accountId: string; account: { currency: Currency } };

/**
 * The accounts behind the two selected cards, when both belong to the user
 * and match the currencies of the direction. Shared by the form check and
 * the exchange itself, so both give the same answer.
 */
export async function resolveCardAccounts(
  client: Prisma.TransactionClient,
  userId: string,
  direction: ExchangeDirection,
  fromCardId: string,
  toCardId: string,
): Promise<
  | { ok: true; fromAccountId: string; toAccountId: string }
  | { ok: false; error: "CARD_NOT_FOUND" | "CURRENCY_MISMATCH" }
> {
  const cards: CardAccount[] = await client.card.findMany({
    where: { id: { in: [fromCardId, toCardId] }, account: { userId } },
    select: { id: true, accountId: true, account: { select: { currency: true } } },
  });
  const from = cards.find((card) => card.id === fromCardId);
  const to = cards.find((card) => card.id === toCardId);
  if (!from || !to) return { ok: false, error: "CARD_NOT_FOUND" };

  const sides = SIDES[direction];
  if (from.account.currency !== sides.from || to.account.currency !== sides.to) {
    return { ok: false, error: "CURRENCY_MISMATCH" };
  }
  return { ok: true, fromAccountId: from.accountId, toAccountId: to.accountId };
}

type LockedAccount = { id: string; balanceCents: number };

export function referenceFor(exchangeNumber: number) {
  return `CX-${String(exchangeNumber).padStart(6, "0")}`;
}

/**
 * Buys or sells dollars between two accounts of the same user at the
 * simulated rate, in one database transaction.
 *
 * Both account rows are locked in id order before any balance is read, the
 * same order transfers use, so concurrent operations on an account run one
 * after another and a buy and a sell at once cannot deadlock.
 */
export async function exchange({
  userId,
  direction,
  usdCents,
  fromCardId,
  toCardId,
  idempotencyKey,
}: ExchangeRequest): Promise<ExchangeResult> {
  if (!isExchangeAmount(usdCents)) {
    return { ok: false, error: "INVALID_AMOUNT" };
  }
  const arsCents = usdToArsCents(usdCents);
  const debitCents = direction === "BUY" ? arsCents : usdCents;
  const creditCents = direction === "BUY" ? usdCents : arsCents;

  return db.$transaction(async (tx) => {
    // A card's account, owner and currency never change, so reading them
    // before the lock is safe; balances are only read under the lock below.
    const accounts = await resolveCardAccounts(tx, userId, direction, fromCardId, toCardId);
    if (!accounts.ok) return accounts;
    const { fromAccountId, toAccountId } = accounts;

    const locked = await tx.$queryRaw<LockedAccount[]>`
      SELECT "id", "balanceCents" FROM "Account"
      WHERE "id" IN (${fromAccountId}, ${toAccountId})
      ORDER BY "id"
      FOR UPDATE`;
    const from = locked.find((account) => account.id === fromAccountId);
    if (!from) return { ok: false, error: "CARD_NOT_FOUND" };

    // Checked after the lock, so a concurrent duplicate sees the first commit.
    const existing = await tx.exchange.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: {
        id: true,
        direction: true,
        usdCents: true,
        fromAccountId: true,
        toAccountId: true,
        movements: { select: { id: true, accountId: true } },
      },
    });
    if (existing) {
      const same =
        existing.direction === direction &&
        existing.usdCents === usdCents &&
        existing.fromAccountId === fromAccountId &&
        existing.toAccountId === toAccountId;
      const movement = existing.movements.find((m) => m.accountId === existing.fromAccountId);
      // A key belongs to one confirmation: replaying it with other values
      // must not report success for an exchange that never happened.
      return same && movement
        ? { ok: true, exchangeId: existing.id, movementId: movement.id }
        : { ok: false, error: "IDEMPOTENCY_MISMATCH" };
    }

    if (from.balanceCents < debitCents) {
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    }

    await tx.account.update({
      where: { id: fromAccountId },
      data: { balanceCents: { decrement: debitCents } },
    });
    await tx.account.update({
      where: { id: toAccountId },
      data: { balanceCents: { increment: creditCents } },
    });

    const created = await tx.exchange.create({
      data: {
        userId,
        direction,
        usdCents,
        arsCents,
        rateArsPerUsd: ARS_PER_USD,
        fromAccountId,
        toAccountId,
        idempotencyKey,
      },
    });
    const shared = {
      exchangeId: created.id,
      type: "EXCHANGE" as const,
      counterparty: COUNTERPARTY[direction],
      reference: referenceFor(created.number),
      occurredAt: created.createdAt,
    };

    const debit = await tx.movement.create({
      data: { ...shared, accountId: fromAccountId, amountCents: debitCents },
    });
    await tx.movement.create({
      data: { ...shared, accountId: toAccountId, amountCents: creditCents },
    });

    return { ok: true, exchangeId: created.id, movementId: debit.id };
  });
}

/** The paying side's movement for an already used key, or null when it is unused. */
export async function findExchangeMovementByKey(userId: string, idempotencyKey: string) {
  const found = await db.exchange.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    select: { fromAccountId: true, movements: { select: { id: true, accountId: true } } },
  });
  return found?.movements.find((m) => m.accountId === found.fromAccountId)?.id ?? null;
}
