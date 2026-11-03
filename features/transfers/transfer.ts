import { db } from "@/lib/db";
import { MAX_TRANSFER_CENTS } from "./amount";

export type TransferError =
  | "INVALID_AMOUNT"
  | "INSUFFICIENT_FUNDS"
  | "RECIPIENT_NOT_FOUND"
  | "SELF_TRANSFER";

export type TransferResult =
  | { ok: true; movementId: string }
  | { ok: false; error: TransferError };

export type TransferRequest = {
  senderId: string;
  recipientId: string;
  amountCents: number;
  /** Same key, same transfer: a repeated request returns the first result. */
  idempotencyKey: string;
};

type LockedAccount = { id: string; userId: string; balanceCents: number };

function referenceFor(transferNumber: number) {
  return `TRF-${String(transferNumber).padStart(6, "0")}`;
}

/**
 * Moves money between two users' accounts in one database transaction.
 *
 * Both account rows are locked in id order before anything is read, so
 * concurrent transfers from the same account run one after another (the
 * balance check always sees the latest balance) and two users sending to
 * each other cannot deadlock.
 */
export async function transfer({
  senderId,
  recipientId,
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
  if (senderId === recipientId) {
    return { ok: false, error: "SELF_TRANSFER" };
  }

  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<LockedAccount[]>`
      SELECT "id", "userId", "balanceCents" FROM "Account"
      WHERE "userId" IN (${senderId}, ${recipientId})
      ORDER BY "id"
      FOR UPDATE`;

    const from = locked.find((account) => account.userId === senderId);
    const to = locked.find((account) => account.userId === recipientId);
    if (!from) {
      throw new Error(`User ${senderId} has no account.`);
    }

    // Checked after the lock, so a concurrent duplicate sees the first commit.
    const existing = await tx.transfer.findUnique({
      where: {
        fromAccountId_idempotencyKey: { fromAccountId: from.id, idempotencyKey },
      },
      select: { movements: { where: { accountId: from.id }, select: { id: true } } },
    });
    if (existing) {
      return { ok: true, movementId: existing.movements[0].id };
    }

    if (!to) {
      return { ok: false, error: "RECIPIENT_NOT_FOUND" };
    }
    if (from.balanceCents < amountCents) {
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    }

    const users = await tx.user.findMany({
      where: { id: { in: [senderId, recipientId] } },
      select: { id: true, name: true },
    });
    const nameOf = (id: string) => users.find((user) => user.id === id)!.name;

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
      where: { ownerId_contactId: { ownerId: senderId, contactId: recipientId } },
      create: { ownerId: senderId, contactId: recipientId },
      update: {},
    });

    return { ok: true, movementId: sent.id };
  });
}
