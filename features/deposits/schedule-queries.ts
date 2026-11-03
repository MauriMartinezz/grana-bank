import { db } from "@/lib/db";

/** The user's scheduled deposits, oldest first. */
export function listDepositSchedules(userId: string) {
  return db.depositSchedule.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}
