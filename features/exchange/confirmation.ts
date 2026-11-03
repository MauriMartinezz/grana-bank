import { randomUUID } from "node:crypto";
import type { ExchangeDirection } from "@/generated/prisma/client";
import { isIdempotencyKey } from "@/features/transfers/confirmation";
import { isExchangeAmount } from "./rate";

type SearchParam = string | string[] | undefined;

export type ExchangeDraft = {
  direction: ExchangeDirection;
  usdCents: number;
  fromCardId: string;
  toCardId: string;
};

// Ids are UUIDs; this only keeps the URL and the query free of surprises.
const ID_PATTERN = /^[\w-]{1,64}$/;

export function isDirection(value: unknown): value is ExchangeDirection {
  return value === "BUY" || value === "SELL";
}

export function isCardId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function confirmationPath(draft: ExchangeDraft, idempotencyKey: string) {
  const query = new URLSearchParams({
    direction: draft.direction,
    usd: String(draft.usdCents),
    from: draft.fromCardId,
    to: draft.toCardId,
    key: idempotencyKey,
  });
  return `/exchange/confirm?${query}`;
}

/**
 * Reads the confirmation URL. The form step creates the key, and it stays in
 * the URL, so every render of one confirmation uses the same key.
 */
export function readExchangeConfirmation(
  params: { direction: SearchParam; usd: SearchParam; from: SearchParam; to: SearchParam; key: SearchParam },
  newKey: () => string = randomUUID,
): (ExchangeDraft & { idempotencyKey: string }) | { redirectTo: string } {
  const { direction, usd, from, to, key } = params;
  const usdCents = typeof usd === "string" && /^\d{1,12}$/.test(usd) ? Number(usd) : 0;
  if (!isDirection(direction) || !isExchangeAmount(usdCents) || !isCardId(from) || !isCardId(to)) {
    return { redirectTo: "/exchange" };
  }
  const draft = { direction, usdCents, fromCardId: from, toCardId: to };
  if (typeof key !== "string" || !isIdempotencyKey(key)) {
    return { redirectTo: confirmationPath(draft, newKey()) };
  }
  return { ...draft, idempotencyKey: key.toLowerCase() };
}
