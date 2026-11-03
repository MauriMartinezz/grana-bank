import { db } from "@/lib/db";

export function getAccount(userId: string) {
  return db.account.findUnique({ where: { userId } });
}
