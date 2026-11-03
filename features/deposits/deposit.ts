import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { transfer, type TransferError } from "@/features/transfers/transfer";
import { MAX_DEPOSIT_CENTS, TEST_ACCOUNT } from "./test-account";

export type DepositError =
  | "INVALID_AMOUNT"
  | "AMOUNT_TOO_HIGH"
  | "NO_ACCOUNT"
  | "TEST_ACCOUNT_MISSING"
  | TransferError;

export type DepositResult = { ok: true; movementId: string } | { ok: false; error: DepositError };

/** The test account of a currency, with what the screen shows of it. */
export async function findTestAccount(currency: Currency) {
  const account = await db.account.findFirst({
    // The seeded one, by its email: the flag alone could match another.
    where: { currency, user: { isTestAccount: true, email: TEST_ACCOUNT.email } },
    select: { id: true, alias: true, currency: true, user: { select: { id: true, firstName: true } } },
  });
  return (
    account && {
      accountId: account.id,
      userId: account.user.id,
      name: account.user.firstName,
      alias: account.alias,
      currency: account.currency,
    }
  );
}

/**
 * Adds money to the user's account of `currency` from the test account of
 * that currency. It is a transfer like any other (same locks, same
 * idempotency key), so the user sees a payment received from "Cuenta de
 * prueba". Returns the user's received movement.
 */
export async function deposit({
  userId,
  currency,
  amountCents,
  idempotencyKey,
}: {
  userId: string;
  currency: Currency;
  amountCents: number;
  idempotencyKey: string;
}): Promise<DepositResult> {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return { ok: false, error: "INVALID_AMOUNT" };
  }
  if (amountCents > MAX_DEPOSIT_CENTS[currency]) return { ok: false, error: "AMOUNT_TOO_HIGH" };

  const [source, target] = await Promise.all([
    findTestAccount(currency),
    db.account.findUnique({
      where: { userId_currency: { userId, currency } },
      select: { id: true },
    }),
  ]);
  if (!source) return { ok: false, error: "TEST_ACCOUNT_MISSING" };
  if (!target) return { ok: false, error: "NO_ACCOUNT" };

  const result = await transfer({
    senderId: source.userId,
    recipientAccountId: target.id,
    amountCents,
    idempotencyKey,
  });
  if (!result.ok) return result;

  // The transfer returns the sender's side; the user sees the received one.
  const received = await db.movement.findFirst({
    where: { accountId: target.id, transfer: { movements: { some: { id: result.movementId } } } },
    select: { id: true },
  });
  if (!received) return { ok: false, error: "RECIPIENT_NOT_FOUND" };
  return { ok: true, movementId: received.id };
}
