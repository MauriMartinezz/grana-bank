import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getPromotion, listPromotions, listTodayPromotions } from "./queries";

// Test rows carry this merchant prefix, so seeded promotions never get in the way.
const PREFIX = "Prueba promo";
const NOW = new Date("2026-11-03T15:00:00Z"); // Tuesday in Buenos Aires
const FROM = new Date("2026-11-01T00:00:00Z");
const UNTIL = new Date("2026-11-30T00:00:00Z");

function promotion(name: string, overrides: Record<string, unknown> = {}) {
  return {
    merchant: `${PREFIX} ${name}`,
    category: "CINE" as const,
    percent: 10,
    capCents: BigInt(100_000),
    weekdays: [2],
    cardBrand: null,
    validFrom: FROM,
    validUntil: UNTIL,
    conditions: "Condiciones de prueba.",
    ...overrides,
  };
}

const mine = <T extends { merchant: string }>(rows: T[]) =>
  rows.filter((row) => row.merchant.startsWith(PREFIX)).map((row) => row.merchant);

beforeEach(async () => {
  await db.promotion.deleteMany({ where: { merchant: { startsWith: PREFIX } } });
  await db.promotion.createMany({
    data: [
      promotion("martes cine 10"),
      promotion("martes cine 40", { percent: 40 }),
      promotion("martes cine 40 tope alto", { percent: 40, capCents: BigInt(900_000) }),
      promotion("viernes ropa", { category: "ROPA", weekdays: [5] }),
      promotion("vencida", { validUntil: new Date("2026-11-02T00:00:00Z") }),
      promotion("futura", { validFrom: new Date("2026-11-04T00:00:00Z") }),
    ],
  });
});

afterAll(async () => {
  await db.promotion.deleteMany({ where: { merchant: { startsWith: PREFIX } } });
});

describe("listPromotions", () => {
  it("lists a day's promotions in force today, by discount and cap, highest first", async () => {
    expect(mine(await listPromotions({ weekday: 2, category: null }, NOW))).toEqual([
      `${PREFIX} martes cine 40 tope alto`,
      `${PREFIX} martes cine 40`,
      `${PREFIX} martes cine 10`,
    ]);
  });

  it("lists a promotion without cap first among those of its discount", async () => {
    await db.promotion.create({
      data: promotion("martes cine 40 sin limite", { percent: 40, capCents: null }),
    });
    expect(mine(await listPromotions({ weekday: 2, category: null }, NOW))).toEqual([
      `${PREFIX} martes cine 40 sin limite`,
      `${PREFIX} martes cine 40 tope alto`,
      `${PREFIX} martes cine 40`,
      `${PREFIX} martes cine 10`,
    ]);
  });

  it("filters by category and shows every day without a weekday", async () => {
    expect(mine(await listPromotions({ weekday: 5, category: "ROPA" }, NOW))).toEqual([
      `${PREFIX} viernes ropa`,
    ]);
    expect(mine(await listPromotions({ weekday: null, category: "ROPA" }, NOW))).toEqual([
      `${PREFIX} viernes ropa`,
    ]);
    expect(mine(await listPromotions({ weekday: null, category: null }, NOW))).toHaveLength(4);
  });
});

describe("listTodayPromotions", () => {
  it("takes today's best three", async () => {
    const today = await listTodayPromotions(NOW);
    expect(today.length).toBeLessThanOrEqual(3);
    expect(today.every((row) => row.weekdays.includes(2))).toBe(true);
  });
});

describe("getPromotion", () => {
  it("finds a promotion by id and nothing for an unknown or malformed id", async () => {
    const [row] = await db.promotion.findMany({ where: { merchant: `${PREFIX} viernes ropa` } });
    expect((await getPromotion(row.id))?.merchant).toBe(`${PREFIX} viernes ropa`);
    expect(await getPromotion("6f1c2b7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f")).toBeNull();
    expect(await getPromotion("not-an-id")).toBeNull();
  });
});
