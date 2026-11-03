import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { addDays, startOfDay } from "./day";
import { NO_FILTERS, type MovementFilters } from "./filters";

const MAX_MOVEMENTS = 50;

/** How many movements Home shows, across every account of the user. */
export const RECENT_MOVEMENTS = 6;

// Only what a row shows: never the holder, expiry or any other card data.
const MOVEMENT_INCLUDE = {
  account: { select: { currency: true } },
  card: { select: { last4: true, brand: true } },
} as const;

/** `%` and `_` are LIKE wildcards; a search must match them literally. */
function escapeLikePattern(text: string) {
  return text.replace(/[\\%_]/g, "\\$&");
}

/** From midnight of `from` to the midnight that ends `to`, in Buenos Aires. */
function occurredAtRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  return {
    ...(from && { gte: startOfDay(from) }),
    ...(to && { lt: startOfDay(addDays(to, 1)) }),
  };
}

// Every query goes through `account.userId`, so a user can never read
// movements from another account, even by guessing an id. Without a
// currency, the movements of every account of the user are listed.
export function listMovements(
  userId: string,
  { query, type, from, to }: MovementFilters = NO_FILTERS,
  limit = MAX_MOVEMENTS,
  currency?: Currency,
) {
  const occurredAt = occurredAtRange(from, to);
  return db.movement.findMany({
    where: {
      account: { userId, ...(currency && { currency }) },
      ...(type && { type }),
      ...(occurredAt && { occurredAt }),
      ...(query && {
        counterparty: {
          contains: escapeLikePattern(query),
          mode: "insensitive" as const,
        },
      }),
    },
    orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
    take: limit,
    include: MOVEMENT_INCLUDE,
  });
}

/**
 * The movements made with one card, newest first. Scoped by `account.userId`
 * as well, so another user's card id returns nothing.
 */
export function listCardMovements(userId: string, cardId: string, limit = MAX_MOVEMENTS) {
  return db.movement.findMany({
    where: { cardId, account: { userId } },
    orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
    take: limit,
    include: MOVEMENT_INCLUDE,
  });
}

/** The latest movements of every account of the user, for Home. */
export function listRecentMovements(userId: string) {
  return listMovements(userId, NO_FILTERS, RECENT_MOVEMENTS);
}

export type MovementListItem = Awaited<
  ReturnType<typeof listMovements>
>[number];

export function getMovement(userId: string, id: string) {
  return db.movement.findFirst({
    where: { id, account: { userId } },
    include: {
      ...MOVEMENT_INCLUDE,
      transfer: { select: { note: true } },
      topUp: { select: { note: true } },
      servicePayment: { select: { note: true } },
      category: { select: { id: true, name: true } },
    },
  });
}
