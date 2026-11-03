import { randomUUID } from "node:crypto";
import { validateNote } from "@/features/categories/names";
import { isCardId } from "@/features/exchange/confirmation";
import { isIdempotencyKey } from "@/features/transfers/confirmation";
import {
  isProviderOf,
  isTopUpAmount,
  isTopUpKind,
  type TopUpKind,
  type TopUpProvider,
} from "./validation";

type SearchParam = string | string[] | undefined;

export type TopUpDraft = {
  kind: TopUpKind;
  provider: TopUpProvider;
  /** The SUBE card id, or the normalized phone or DirecTV number. */
  target: string;
  amountCents: number;
  cardId: string;
  /** The optional note, normalized; absent or null when there is none. */
  note?: string | null;
};

/** The form each kind starts from, where "Modificar" and bad URLs go back to. */
export function formPathFor(kind: TopUpKind, target?: string) {
  if (kind === "SUBE") return target && isCardId(target) ? `/recargas/sube/${target}` : "/recargas/sube";
  return kind === "PHONE" ? "/recargas/celular" : "/recargas/directv";
}

export function confirmationPath(draft: TopUpDraft, idempotencyKey: string) {
  const query = new URLSearchParams({
    kind: draft.kind,
    provider: draft.provider,
    target: draft.target,
    amount: String(draft.amountCents),
    card: draft.cardId,
    key: idempotencyKey,
  });
  if (draft.note) query.set("note", draft.note);
  return `/recargas/confirmar?${query}`;
}

function isTargetShape(kind: TopUpKind, target: unknown): target is string {
  if (kind === "SUBE") return isCardId(target);
  return typeof target === "string" && /^\d{8,12}$/.test(target);
}

/**
 * Reads the confirmation URL. The form step creates the key, and it stays in
 * the URL, so every render of one confirmation uses the same key. Only the
 * shape is checked here; the page checks ownership and the number itself.
 */
export function readTopUpConfirmation(
  params: {
    kind: SearchParam;
    provider: SearchParam;
    target: SearchParam;
    amount: SearchParam;
    card: SearchParam;
    key: SearchParam;
    note?: SearchParam;
  },
  newKey: () => string = randomUUID,
): (TopUpDraft & { idempotencyKey: string }) | { redirectTo: string } {
  const { kind, provider, target, amount, card, key, note } = params;
  if (!isTopUpKind(kind)) return { redirectTo: "/recargas" };
  const amountCents = typeof amount === "string" && /^\d{1,12}$/.test(amount) ? Number(amount) : 0;
  if (
    !isProviderOf(kind, provider) ||
    !isTargetShape(kind, target) ||
    !isTopUpAmount(amountCents) ||
    !isCardId(card) ||
    Array.isArray(note)
  ) {
    return { redirectTo: formPathFor(kind, typeof target === "string" ? target : undefined) };
  }
  const validNote = validateNote(note ?? "");
  if (!validNote.ok) return { redirectTo: formPathFor(kind, target) };
  // Only present with a note, so a URL without one reads as it always did.
  const draft: TopUpDraft = {
    kind,
    provider,
    target,
    amountCents,
    cardId: card,
    ...(validNote.note ? { note: validNote.note } : {}),
  };
  if (typeof key !== "string" || !isIdempotencyKey(key)) {
    return { redirectTo: confirmationPath(draft, newKey()) };
  }
  return { ...draft, idempotencyKey: key.toLowerCase() };
}
