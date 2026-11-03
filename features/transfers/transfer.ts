import { fullName } from "@/features/account/name";
import { db } from "@/lib/db";
import { MAX_TRANSFER_CENTS } from "./amount";

export type TransferError =
  | "INVALID_AMOUNT"
  | "INSUFFICIENT_FUNDS"
  | "RECIPIENT_NOT_FOUND"
  | "SELF_TRANSFER"
  | "CURRENCY_MISMATCH"
  | "IDEMPOTENCY_MISMATCH";

export type TransferResult =
  | { ok: true; movementId: string }
  | { ok: false; error: TransferError };

export type TransferRequest = {
  senderId: string;
  /** The money leaves the sender's account in this account's currency. */
  recipientAccountId: string;
  amountCents: number;
  /**
   * Same key, same transfer: a repeated request returns the first result,
   * and the same key with other values is rejected.
   */
  idempotencyKey: string;
};

type LockedAccount = { id: string; userId: string; balanceCents: number };

function referenceFor(transferNumber: number) {
  return `TRF-${String(transferNumber).padStart(6, "0")}`;
}

/**
 * Moves money between two accounts of the same currency in one database
 * transaction. The sender pays from their account in the recipient
 * account's currency.
 *
 * Both account rows are locked in id order before any balance is read, so
 * concurrent transfers from the same account run one after another (the
 * balance check always sees the latest balance) and two users sending to
 * each other cannot deadlock.
 */
export async function transfer({
  senderId,
  recipientAccountId,
  amountCents,
  idempotencyKey,
}: TransferRequest): Promise<TransferResult> {
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > MAX_TRANSFER_CENTS
  ) {
    return { ok: false, error: "INVALID_AMOUNT" };
  }

  return db.$transaction(async (tx) => {
    // Owner and currency never change, so reading them before the lock is
    // safe; the balance is only read under the lock below.
    const target = await tx.account.findUnique({
      where: { id: recipientAccountId },
      select: { userId: true, currency: true },
    });
    if (!target) {
      return { ok: false, error: "RECIPIENT_NOT_FOUND" };
    }
    if (target.userId === senderId) {
      return { ok: false, error: "SELF_TRANSFER" };
    }

    const locked = await tx.$queryRaw<LockedAccount[]>`
      SELECT "id", "userId", "balanceCents" FROM "Account"
      WHERE "id" = ${recipientAccountId}
        OR ("userId" = ${senderId} AND "currency" = ${target.currency}::"Currency")
      ORDER BY "id"
      FOR UPDATE`;

    const from = locked.find((account) => account.userId === senderId);
    const to = locked.find((account) => account.id === recipientAccountId);
    if (!from) {
      return { ok: false, error: "CURRENCY_MISMATCH" };
    }
    const recipientId = target.userId;

    // Checked after the lock, so a concurrent duplicate sees the first commit.
    const existing = await tx.transfer.findUnique({
      where: {
        fromAccountId_idempotencyKey: { fromAccountId: from.id, idempotencyKey },
      },
      select: {
        toAccountId: true,
        amountCents: true,
        movements: { where: { accountId: from.id }, select: { id: true } },
      },
    });
    if (existing) {
      // A key belongs to one confirmation: replaying it with other values
      // must not report success for a transfer that never happened.
      return existing.toAccountId === to?.id && existing.amountCents === amountCents
        ? { ok: true, movementId: existing.movements[0].id }
        : { ok: false, error: "IDEMPOTENCY_MISMATCH" };
    }

    if (!to) {
      return { ok: false, error: "RECIPIENT_NOT_FOUND" };
    }
    if (from.balanceCents < amountCents) {
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    }

    const users = await tx.user.findMany({
      where: { id: { in: [senderId, recipientId] } },
      select: { id: true, firstName: true, lastName: true },
    });
    const nameOf = (id: string) => fullName(users.find((user) => user.id === id)!);

    await tx.account.update({
      where: { id: from.id },
      data: { balanceCents: { decrement: amountCents } },
    });
    await tx.account.update({
      where: { id: to.id },
      data: { balanceCents: { increment: amountCents } },
    });

    const { id: transferId, number, createdAt } = await tx.transfer.create({
      data: {
        fromAccountId: from.id,
        toAccountId: to.id,
        amountCents,
        idempotencyKey,
      },
    });
    const shared = {
      transferId,
      amountCents,
      reference: referenceFor(number),
      occurredAt: createdAt,
    };

    const sent = await tx.movement.create({
      data: {
        ...shared,
        accountId: from.id,
        type: "SENT",
        counterparty: nameOf(recipientId),
      },
    });
    await tx.movement.create({
      data: {
        ...shared,
        accountId: to.id,
        type: "RECEIVED",
        counterparty: nameOf(senderId),
      },
    });

    // Keeps an existing contact as it is, including its favorite flag.
    await tx.contact.upsert({
      where: {
        ownerId_contactAccountId: { ownerId: senderId, contactAccountId: to.id },
      },
      create: { ownerId: senderId, contactAccountId: to.id },
      update: {},
    });

    return { ok: true, movementId: sent.id };
  });
}

/** The sender's movement for an already used key, or null when it is unused. */
export async function findSentMovementByKey(senderId: string, idempotencyKey: string) {
  const found = await db.transfer.findFirst({
    where: { idempotencyKey, fromAccount: { userId: senderId } },
    select: {
      fromAccountId: true,
      movements: { select: { id: true, accountId: true } },
    },
  });
  return found?.movements.find((m) => m.accountId === found.fromAccountId)?.id ?? null;
}
