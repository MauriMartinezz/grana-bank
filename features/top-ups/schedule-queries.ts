import { db } from "@/lib/db";

/** The user's scheduled top-ups of one SUBE card, oldest first. */
export function listTopUpSchedules(userId: string, subeCardId: string) {
  return db.topUpSchedule.findMany({
    where: { userId, subeCardId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}
