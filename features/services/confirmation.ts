import { randomUUID } from "node:crypto";
import { validateNote } from "@/features/categories/names";
import { isCardId } from "@/features/exchange/confirmation";
import { isIdempotencyKey } from "@/features/transfers/confirmation";

type SearchParam = string | string[] | undefined;

export type BillPaymentDraft = {
  billId: string;
  cardId: string;
  /** The optional note, normalized; absent or null when there is none. */
  note?: string | null;
};

export function confirmationPath(draft: BillPaymentDraft, idempotencyKey: string) {
  const query = new URLSearchParams({ bill: draft.billId, card: draft.cardId, key: idempotencyKey });
  if (draft.note) query.set("note", draft.note);
  return `/servicios/confirmar?${query}`;
}

/** The bill's payment form, where "Modificar" and bad URLs go back to. */
export function payPathFor(billId: string) {
  return `/servicios/pagar/${billId}`;
}

/**
 * Reads the confirmation URL. The form step creates the key, and it stays in
 * the URL, so every render of one confirmation uses the same key. Only the
 * shape is checked here; the page checks ownership and the bill's status.
 */
export function readBillConfirmation(
  params: { bill: SearchParam; card: SearchParam; key: SearchParam; note?: SearchParam },
  newKey: () => string = randomUUID,
): (BillPaymentDraft & { idempotencyKey: string }) | { redirectTo: string } {
  const { bill, card, key, note } = params;
  // Ids share the card id shape: UUIDs, kept free of URL surprises.
  if (!isCardId(bill)) return { redirectTo: "/servicios" };
  if (!isCardId(card)) return { redirectTo: payPathFor(bill) };
  const validNote = Array.isArray(note) ? null : validateNote(note ?? "");
  if (!validNote?.ok) return { redirectTo: payPathFor(bill) };
  // Only present with a note, so a URL without one reads as it always did.
  const draft: BillPaymentDraft = {
    billId: bill,
    cardId: card,
    ...(validNote.note ? { note: validNote.note } : {}),
  };
  if (typeof key !== "string" || !isIdempotencyKey(key)) {
    return { redirectTo: confirmationPath(draft, newKey()) };
  }
  return { ...draft, idempotencyKey: key.toLowerCase() };
}
