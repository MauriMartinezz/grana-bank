/**
 * Loads the invented promotions, in force from the first day of this month to
 * the last day of the next one, so the demo always shows them. The seed calls
 * it, and `pnpm db:promos` runs it alone, without touching the users.
 */
import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PROMOTIONS } from "../features/promotions/catalog";
import { buenosAiresDate } from "../features/services/due-date";
import { PrismaClient } from "../generated/prisma/client";

export async function loadPromotions(prisma: PrismaClient, now: Date = new Date()) {
  const { year, month } = buenosAiresDate(now);
  await prisma.promotion.deleteMany();
  await prisma.promotion.createMany({
    data: PROMOTIONS.map(({ capPesos, ...promotion }) => ({
      ...promotion,
      capCents: BigInt(capPesos) * BigInt(100),
      validFrom: new Date(Date.UTC(year, month - 1, 1)),
      validUntil: new Date(Date.UTC(year, month + 1, 0)),
    })),
  });
  return PROMOTIONS.length;
}

// Run directly: `pnpm db:promos`.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  loadPromotions(prisma)
    .then((count) => console.log(`Loaded ${count} promotions.`))
    .finally(() => prisma.$disconnect());
}
