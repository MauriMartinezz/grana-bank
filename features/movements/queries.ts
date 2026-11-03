import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";
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

// Every query goes through `account.userId`, so a user can never read
// movements from another account, even by guessing an id. Without a
// currency, the movements of every account of the user are listed.
export function listMovements(
  userId: string,
  { query, type }: MovementFilters = NO_FILTERS,
  limit = MAX_MOVEMENTS,
  currency?: Currency,
) {
  return db.movement.findMany({
    where: {
      account: { userId, ...(currency && { currency }) },
      ...(type && { type }),
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
    include: MOVEMENT_INCLUDE,
  });
}
