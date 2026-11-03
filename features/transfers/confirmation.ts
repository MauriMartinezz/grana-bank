import { randomUUID } from "node:crypto";
import { MAX_TRANSFER_CENTS } from "./amount";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isIdempotencyKey(value: string) {
  return UUID_PATTERN.test(value);
}

type SearchParam = string | string[] | undefined;

/**
 * Reads the confirmation URL. The amount step creates the key, and it stays
 * in the URL, so every render of one confirmation uses the same key.
 */
export function readConfirmation(
  recipientAccountId: string,
  amount: SearchParam,
  key: SearchParam,
  newKey: () => string = randomUUID,
): { amountCents: number; idempotencyKey: string } | { redirectTo: string } {
  const cents = typeof amount === "string" && /^\d{1,12}$/.test(amount) ? Number(amount) : 0;
  if (cents <= 0 || cents > MAX_TRANSFER_CENTS) {
    return { redirectTo: `/transfers/to/${recipientAccountId}` };
  }
  if (typeof key !== "string" || !isIdempotencyKey(key)) {
    return {
      redirectTo: `/transfers/to/${recipientAccountId}/confirm?amount=${cents}&key=${newKey()}`,
    };
  }
  return { amountCents: cents, idempotencyKey: key.toLowerCase() };
}
