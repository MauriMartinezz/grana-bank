import { db } from "@/lib/db";

/** The account, only when it belongs to the user; null otherwise. */
export function getOwnAccount(userId: string, accountId: string) {
  return db.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true, alias: true, currency: true },
  });
}
