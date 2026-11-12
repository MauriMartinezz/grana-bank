import { calendarToday } from "@/features/services/due-date";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { PromotionCategory } from "./catalog";
import { buenosAiresWeekday } from "./filters";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BEST_FIRST: Prisma.PromotionOrderByWithRelationInput[] = [
  { percent: "desc" },
  // No cap gives back the most, so it goes first.
  { capCents: { sort: "desc", nulls: "first" } },
  { merchant: "asc" },
  { id: "asc" },
];

export const TODAY_PROMOTIONS = 3;

/** In force on the calendar day of `now` in Buenos Aires. */
function inForce(now: Date): Prisma.PromotionWhereInput {
  const today = calendarToday(now);
  return { validFrom: { lte: today }, validUntil: { gte: today } };
}

/**
 * The promotions in force today for a weekday (every day when null) and a
 * category (every category when null), highest discount first.
 */
export function listPromotions(
  { weekday, category }: { weekday: number | null; category: PromotionCategory | null },
  now: Date,
) {
  return db.promotion.findMany({
    where: {
      ...inForce(now),
      ...(weekday === null ? {} : { weekdays: { has: weekday } }),
      ...(category === null ? {} : { category }),
    },
    orderBy: BEST_FIRST,
  });
}

/** Home's "Promos de hoy": today's best few. */
export function listTodayPromotions(now: Date) {
  return db.promotion.findMany({
    where: { ...inForce(now), weekdays: { has: buenosAiresWeekday(now) } },
    orderBy: BEST_FIRST,
    take: TODAY_PROMOTIONS,
  });
}

export function getPromotion(id: string) {
  return UUID.test(id) ? db.promotion.findUnique({ where: { id } }) : Promise.resolve(null);
}

/** Every promotion, in force or not, newest first: the admin list. */
export function listAllPromotions() {
  return db.promotion.findMany({
    orderBy: [{ validFrom: "desc" }, { merchant: "asc" }, { id: "asc" }],
  });
}
