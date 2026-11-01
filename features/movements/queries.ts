import { db } from "@/lib/db";
import { NO_FILTERS, type MovementFilters } from "./filters";

const MAX_MOVEMENTS = 50;

/** `%` and `_` are LIKE wildcards; a search must match them literally. */
function escapeLikePattern(text: string) {
  return text.replace(/[\\%_]/g, "\\$&");
}

// Every query goes through `account.userId`, so a user can never read
// movements from another account, even by guessing an id.
export function listMovements(
  userId: string,
  { query, type }: MovementFilters = NO_FILTERS,
  limit = MAX_MOVEMENTS,
) {
  return db.movement.findMany({
    where: {
      account: { userId },
      ...(type && { type }),
      ...(query && {
        counterparty: {
          contains: escapeLikePattern(query),
          mode: "insensitive" as const,
        },
      }),
    },
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: { account: { select: { currency: true } } },
  });
}

export type MovementListItem = Awaited<
  ReturnType<typeof listMovements>
>[number];

export function getMovement(userId: string, id: string) {
  return db.movement.findFirst({
    where: { id, account: { userId } },
    include: { account: { select: { currency: true } } },
  });
}
