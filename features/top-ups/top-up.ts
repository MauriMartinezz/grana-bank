import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  formatPhone,
  isProviderOf,
  isTopUpAmount,
  maskDigits,
  normalizeDirectvAccount,
  normalizePhone,
  PROVIDER_NAMES,
  type TopUpKind,
  type TopUpProvider,
} from "./validation";

export type TopUpError =
  | "INVALID_AMOUNT"
  | "INVALID_TARGET"
  | "SUBE_CARD_NOT_FOUND"
  | "INSUFFICIENT_FUNDS"
  | "CARD_NOT_FOUND"
  | "CURRENCY_MISMATCH"
  | "IDEMPOTENCY_MISMATCH";

export type TopUpResult =
  | { ok: true; topUpId: string; movementId: string }
  | { ok: false; error: TopUpError };

export type TopUpRequest = {
  userId: string;
  kind: TopUpKind;
  provider: TopUpProvider;
  /**
   * The SUBE card id, the phone number or the DirecTV account number. Phone
   * and account numbers may come as typed: they are normalized here.
   */
  target: string;
  /** A typed amount in cents, so a safe integer. */
  amountCents: number;
  /** A card of one of the user's peso accounts. */
  cardId: string;
  /**
   * Same key, same top-up: a repeated request returns the first result, and
   * the same key with other values is rejected.
   */
  idempotencyKey: string;
};

export type ResolvedTarget = {
  /** What is stored: the SUBE card id or the number, digits only. */
  target: string;
  /** How the movement and the screens name it. */
  label: string;
  /** The SUBE card, for the screens that show its nickname. */
  subeCard?: { id: string; nickname: string; number: string };
};

/**
 * Checks the provider and the target of a top-up and returns how they are
 * stored and shown. A SUBE target must be one of the user's own SUBE cards.
 * Shared by the form, the confirmation screen and the top-up itself.
 */
export async function resolveTarget(
  client: Prisma.TransactionClient,
  userId: string,
  kind: TopUpKind,
  provider: TopUpProvider,
  rawTarget: string,
): Promise<
  | ({ ok: true } & ResolvedTarget)
  | { ok: false; error: "INVALID_TARGET" | "SUBE_CARD_NOT_FOUND" }
> {
  if (!isProviderOf(kind, provider)) return { ok: false, error: "INVALID_TARGET" };

  if (kind === "SUBE") {
    const subeCard = await client.subeCard.findFirst({
      where: { id: rawTarget, userId },
      select: { id: true, nickname: true, number: true },
    });
    if (!subeCard) return { ok: false, error: "SUBE_CARD_NOT_FOUND" };
    return {
      ok: true,
      target: subeCard.id,
      label: `${subeCard.nickname} ${maskDigits(subeCard.number)}`,
      subeCard,
    };
  }

  if (kind === "PHONE") {
    const phone = normalizePhone(rawTarget);
    return phone
      ? { ok: true, target: phone, label: formatPhone(phone) }
      : { ok: false, error: "INVALID_TARGET" };
  }

  const account = normalizeDirectvAccount(rawTarget);
  return account
    ? { ok: true, target: account, label: maskDigits(account) }
    : { ok: false, error: "INVALID_TARGET" };
}

/** The movement name: `Recarga SUBE · sube de mauri ···· 0123`. */
export function counterpartyFor(provider: TopUpProvider, label: string) {
  return `Recarga ${PROVIDER_NAMES[provider]} · ${label}`;
}

/**
 * The peso account behind a card, when the card belongs to the user. Shared
 * by the form check and the top-up itself, so both give the same answer.
 */
export async function resolvePesoCard(
  client: Prisma.TransactionClient,
  userId: string,
  cardId: string,
): Promise<
  { ok: true; accountId: string } | { ok: false; error: "CARD_NOT_FOUND" | "CURRENCY_MISMATCH" }
> {
  const card = await client.card.findFirst({
    where: { id: cardId, account: { userId } },
    select: { accountId: true, account: { select: { currency: true } } },
  });
  if (!card) return { ok: false, error: "CARD_NOT_FOUND" };
  if (card.account.currency !== "ARS") return { ok: false, error: "CURRENCY_MISMATCH" };
  return { ok: true, accountId: card.accountId };
}

export function referenceFor(topUpNumber: number) {
  return `RC-${String(topUpNumber).padStart(6, "0")}`;
}

// The raw query returns BIGINT columns as bigint.
type LockedAccount = { id: string; balanceCents: bigint };

/**
 * Tops up a SUBE card, a phone line or a DirecTV account from a peso card,
 * in one database transaction.
 *
 * The paying account row is locked before its balance is read, with the same
 * query shape as transfers and exchanges, so concurrent operations on the
 * account run one after another and the balance never goes negative.
 */
export async function topUp({
  userId,
  kind,
  provider,
  target: rawTarget,
  amountCents,
  cardId,
  idempotencyKey,
}: TopUpRequest): Promise<TopUpResult> {
  if (!isTopUpAmount(amountCents)) return { ok: false, error: "INVALID_AMOUNT" };
  const amount = BigInt(amountCents);

  return db.$transaction(async (tx) => {
    // A card's account and a SUBE card's owner never change, so reading them
    // before the lock is safe; the balance is only read under the lock below.
    const target = await resolveTarget(tx, userId, kind, provider, rawTarget);
    if (!target.ok) return target;
    const card = await resolvePesoCard(tx, userId, cardId);
    if (!card.ok) return card;
    const { accountId } = card;

    const locked = await tx.$queryRaw<LockedAccount[]>`
      SELECT "id", "saldo_centavos" AS "balanceCents" FROM "cuentas"
      WHERE "id" = ${accountId}
      ORDER BY "id"
      FOR UPDATE`;
    const account = locked[0];
    if (!account) return { ok: false, error: "CARD_NOT_FOUND" };

    // Checked after the lock, so a concurrent duplicate sees the first commit.
    const existing = await tx.topUp.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: {
        id: true,
        kind: true,
        provider: true,
        target: true,
        amountCents: true,
        cardId: true,
        movements: { select: { id: true } },
      },
    });
    if (existing) {
      const same =
        existing.kind === kind &&
        existing.provider === provider &&
        existing.target === target.target &&
        existing.amountCents === amount &&
        existing.cardId === cardId;
      const movement = existing.movements[0];
      // A key belongs to one confirmation: replaying it with other values
      // must not report success for a top-up that never happened.
      return same && movement
        ? { ok: true, topUpId: existing.id, movementId: movement.id }
        : { ok: false, error: "IDEMPOTENCY_MISMATCH" };
    }

    if (account.balanceCents < amount) return { ok: false, error: "INSUFFICIENT_FUNDS" };

    await tx.account.update({
      where: { id: accountId },
      data: { balanceCents: { decrement: amount } },
    });
    const created = await tx.topUp.create({
      data: {
        userId,
        kind,
        provider,
        target: target.target,
        amountCents: amount,
        accountId,
        cardId,
        idempotencyKey,
      },
    });
    const movement = await tx.movement.create({
      data: {
        accountId,
        cardId,
        topUpId: created.id,
        type: "TOP_UP",
        counterparty: counterpartyFor(provider, target.label),
        amountCents: amount,
        reference: referenceFor(created.number),
        occurredAt: created.createdAt,
      },
    });

    return { ok: true, topUpId: created.id, movementId: movement.id };
  });
}

/** The movement of an already used key, or null when it is unused. */
export async function findTopUpMovementByKey(userId: string, idempotencyKey: string) {
  const found = await db.topUp.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    select: { movements: { select: { id: true }, take: 1 } },
  });
  return found?.movements[0]?.id ?? null;
}
