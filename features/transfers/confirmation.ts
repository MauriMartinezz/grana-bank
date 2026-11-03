import { randomUUID } from "node:crypto";
import { validateNote } from "@/features/categories/names";
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
    return { redirectTo: `/transferir/${recipientAccountId}` };
  }
  if (typeof key !== "string" || !isIdempotencyKey(key)) {
    return {
      redirectTo: `/transferir/${recipientAccountId}/confirmar?amount=${cents}&key=${newKey()}`,
    };
  }
  return { amountCents: cents, idempotencyKey: key.toLowerCase() };
}

/**
 * Reads the optional note and category of the confirmation URL, or null when
 * one is invalid, so the page sends the user back to the amount step.
 */
export function readTransferExtras(
  note: SearchParam,
  category: SearchParam,
): { note: string | null; categoryId: string | null } | null {
  if (Array.isArray(note) || Array.isArray(category)) return null;
  const validNote = validateNote(note ?? "");
  if (!validNote.ok) return null;
  if (category && !UUID_PATTERN.test(category)) return null;
  return { note: validNote.note, categoryId: category ? category.toLowerCase() : null };
}
