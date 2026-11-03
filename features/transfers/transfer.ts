import { fullName } from "@/features/account/name";
import { isOwnCategory } from "@/features/categories/categories";
import { validateNote } from "@/features/categories/names";
import { defaultCardId } from "@/features/cards/default-card";
import { db } from "@/lib/db";
import { MAX_TRANSFER_CENTS } from "./amount";

export type TransferError =
  | "INVALID_AMOUNT"
  | "INSUFFICIENT_FUNDS"
  | "RECIPIENT_NOT_FOUND"
  | "SELF_TRANSFER"
  | "CURRENCY_MISMATCH"
  | "IDEMPOTENCY_MISMATCH"
  | "INVALID_NOTE"
  | "CATEGORY_NOT_FOUND";

export type TransferResult =
  | { ok: true; movementId: string }
  | { ok: false; error: TransferError };

export type TransferRequest = {
  senderId: string;
  /** The money leaves the sender's account in this account's currency. */
  recipientAccountId: string;
  /** A typed amount, so a safe integer; stored as bigint. */
  amountCents: number;
  /**
   * Same key, same transfer: a repeated request returns the first result,
   * and the same key with other values is rejected.
   */
  idempotencyKey: string;
  /**
   * Saves the recipient account as a contact of the sender, when it is not
   * one yet. Not part of the idempotency comparison: it is a preference about
   * the sender's list, not about the money, so a replay of an already done
   * transfer returns the first result and changes nothing, contacts included.
   */
  saveContact?: boolean;
  /**
   * The concept, shown to both sides, up to 140 characters. Like
   * `saveContact`, the note and the category are not compared on a replay:
   * a replayed key returns the first transfer as it was.
   */
  note?: string | null;
  /** One of the sender's categories, set on the sender's movement only. */
  categoryId?: string | null;
};

// The raw query returns BIGINT columns as bigint.
type LockedAccount = { id: string; userId: string; balanceCents: bigint };

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
  saveContact = false,
  note = null,
  categoryId = null,
}: TransferRequest): Promise<TransferResult> {
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > MAX_TRANSFER_CENTS
  ) {
    return { ok: false, error: "INVALID_AMOUNT" };
  }
  const cents = BigInt(amountCents);
  const validNote = validateNote(note ?? "");
  if (!validNote.ok) return { ok: false, error: "INVALID_NOTE" };

  return db.$transaction(async (tx) => {
    // Owner and currency never change, so reading them before the lock is
    // safe; the balance is only read under the lock below.
    const target = await tx.account.findUnique({
      where: { id: recipientAccountId },
      select: { userId: true, currency: true, user: { select: { isTestAccount: true } } },
    });
    // The test account only sends deposits; it never receives money.
    if (!target || target.user.isTestAccount) {
      return { ok: false, error: "RECIPIENT_NOT_FOUND" };
    }
    if (target.userId === senderId) {
      return { ok: false, error: "SELF_TRANSFER" };
    }

    const locked = await tx.$queryRaw<LockedAccount[]>`
      SELECT "id", "usuario_id" AS "userId", "saldo_centavos" AS "balanceCents"
      FROM "cuentas"
      WHERE "id" = ${recipientAccountId}
        OR ("usuario_id" = ${senderId} AND "moneda" = ${target.currency}::"moneda")
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
      return existing.toAccountId === to?.id && existing.amountCents === cents
        ? { ok: true, movementId: existing.movements[0].id }
        : { ok: false, error: "IDEMPOTENCY_MISMATCH" };
    }

    if (!to) {
      return { ok: false, error: "RECIPIENT_NOT_FOUND" };
    }
    if (from.balanceCents < cents) {
      return { ok: false, error: "INSUFFICIENT_FUNDS" };
    }
    if (categoryId !== null && !(await isOwnCategory(tx, senderId, categoryId))) {
      return { ok: false, error: "CATEGORY_NOT_FOUND" };
    }

    const users = await tx.user.findMany({
      where: { id: { in: [senderId, recipientId] } },
      select: { id: true, firstName: true, lastName: true },
    });
    const nameOf = (id: string) => fullName(users.find((user) => user.id === id)!);

    // Each side records its account's default card, read under the locks.
    const [cards, defaults] = await Promise.all([
      tx.card.findMany({
        where: { accountId: { in: [from.id, to.id] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, accountId: true },
      }),
      tx.account.findMany({
        where: { id: { in: [from.id, to.id] } },
        select: { id: true, defaultCardId: true },
      }),
    ]);
    const firstCardOf = (accountId: string) =>
      defaultCardId(
        cards.filter((card) => card.accountId === accountId),
        defaults.find((account) => account.id === accountId)?.defaultCardId ?? null,
      );

    await tx.account.update({
      where: { id: from.id },
      data: { balanceCents: { decrement: cents } },
    });
    await tx.account.update({
      where: { id: to.id },
      data: { balanceCents: { increment: cents } },
    });

    const { id: transferId, number, createdAt } = await tx.transfer.create({
      data: {
        fromAccountId: from.id,
        toAccountId: to.id,
        amountCents: cents,
        idempotencyKey,
        note: validNote.note,
      },
    });
    const shared = {
      transferId,
      amountCents: cents,
      reference: referenceFor(number),
      occurredAt: createdAt,
    };

    const sent = await tx.movement.create({
      data: {
        ...shared,
        accountId: from.id,
        cardId: firstCardOf(from.id),
        categoryId,
        type: "SENT",
        counterparty: nameOf(recipientId),
      },
    });
    await tx.movement.create({
      data: {
        ...shared,
        accountId: to.id,
        cardId: firstCardOf(to.id),
        type: "RECEIVED",
        counterparty: nameOf(senderId),
      },
    });

    if (saveContact) {
      // Keeps an existing contact as it is, including its favorite flag.
      await tx.contact.upsert({
        where: {
          ownerId_contactAccountId: { ownerId: senderId, contactAccountId: to.id },
        },
        create: { ownerId: senderId, contactAccountId: to.id },
        update: {},
      });
    }

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
