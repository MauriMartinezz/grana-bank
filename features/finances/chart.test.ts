import { describe, expect, it } from "vitest";
import type { MovementType } from "@/generated/prisma/client";
import { budgetProgress, buildSpendingSegments, CHART_SLOTS, MAX_SEGMENTS } from "./chart";
import { budgetStatus, summarizeSpending } from "./summary";

let sequence = 0;

function movement(type: MovementType, amountCents: number, category: { id: string; name: string } | null) {
  sequence += 1;
  return {
    id: `m${sequence}`,
    type,
    amountCents: BigInt(amountCents),
    occurredAt: new Date("2026-11-05T15:00:00Z"),
    category,
  };
}

const category = (id: string, name = id) => ({ id, name });
// The user's categories in creation order: the position picks the color slot.
const ORDER = ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"];

function segmentsOf(movements: ReturnType<typeof movement>[], order = ORDER) {
  return buildSpendingSegments(summarizeSpending(movements, []), order);
}

describe("buildSpendingSegments", () => {
  it("has no segments for a month without spending", () => {
    expect(segmentsOf([])).toEqual([]);
    expect(segmentsOf([movement("RECEIVED", 5_000, category("c0"))])).toEqual([]);
  });

  it("gives each category the slot of its position in the category list, in that order", () => {
    const segments = segmentsOf([
      movement("SENT", 1_000, category("c2", "Servicios")),
      movement("SENT", 3_000, category("c0", "Alquiler")),
    ]);

    expect(segments).toEqual([
      {
        key: "c0",
        name: "Alquiler",
        totalCents: BigInt(3_000),
        percent: 75,
        width: 75,
        color: 0,
        groupKeys: ["c0"],
        showLabel: true,
      },
      {
        key: "c2",
        name: "Servicios",
        totalCents: BigInt(1_000),
        percent: 25,
        width: 25,
        color: 2,
        groupKeys: ["c2"],
        showLabel: true,
      },
    ]);
  });

  it("keeps a category's color whatever the month's amounts", () => {
    const november = segmentsOf([
      movement("SENT", 9_000, category("c3")),
      movement("SENT", 1_000, category("c1")),
    ]);
    const december = segmentsOf([
      movement("SENT", 1_000, category("c3")),
      movement("SENT", 9_000, category("c4")),
    ]);

    expect(november.find((segment) => segment.key === "c3")?.color).toBe(3);
    expect(december.find((segment) => segment.key === "c3")?.color).toBe(3);
    expect(december.find((segment) => segment.key === "c4")?.color).toBe(4);
  });

  it("puts Sin categoría in neutral gray after the categories", () => {
    const segments = segmentsOf([
      movement("TOP_UP", 6_000, null),
      movement("SENT", 4_000, category("c1", "Comida")),
    ]);

    expect(segments.map(({ key, name, color, percent }) => ({ key, name, color, percent }))).toEqual([
      { key: "c1", name: "Comida", color: 1, percent: 40 },
      { key: "sin-categoria", name: "Sin categoría", color: "uncategorized", percent: 60 },
    ]);
  });

  it("folds categories past the first six with spending into one gray Resto segment", () => {
    const segments = segmentsOf([
      movement("SENT", 1_000, category("c0")),
      movement("SENT", 1_000, category("c2")),
      movement("SENT", 1_000, category("c3")),
      movement("SENT", 1_000, category("c4")),
      movement("SENT", 1_000, category("c5")),
      movement("SENT", 1_000, category("c6")),
      movement("SENT", 1_000, category("c7")),
      movement("SENT", 2_000, category("c8")),
      movement("SENT", 1_000, null),
    ]);

    expect(MAX_SEGMENTS).toBe(6);
    expect(segments.map(({ key, color, groupKeys }) => ({ key, color, groupKeys }))).toEqual([
      { key: "c0", color: 0, groupKeys: ["c0"] },
      { key: "c2", color: 2, groupKeys: ["c2"] },
      { key: "c3", color: 3, groupKeys: ["c3"] },
      { key: "c4", color: 4, groupKeys: ["c4"] },
      { key: "c5", color: 5, groupKeys: ["c5"] },
      { key: "c6", color: 6, groupKeys: ["c6"] },
      { key: "sin-categoria", color: "uncategorized", groupKeys: ["sin-categoria"] },
      // In the order the group list shows them: highest total first.
      { key: "resto", color: "rest", groupKeys: ["c8", "c7"] },
    ]);
    const rest = segments.at(-1);
    expect(rest).toMatchObject({ name: "Resto", totalCents: BigInt(3_000), percent: 30 });
  });

  it("folds a category with no slot into Resto even with few segments", () => {
    const order = Array.from({ length: CHART_SLOTS + 1 }, (_, index) => `c${index}`);
    const segments = segmentsOf([movement("SENT", 1_000, category(`c${CHART_SLOTS}`))], order);

    expect(segments).toEqual([expect.objectContaining({ key: "resto", color: "rest", groupKeys: ["c8"] })]);
  });

  it("treats a category missing from the list as one without a slot", () => {
    const segments = segmentsOf([
      movement("SENT", 1_000, category("c1")),
      movement("SENT", 1_000, category("gone")),
    ]);

    expect(segments.map(({ key, groupKeys }) => ({ key, groupKeys }))).toEqual([
      { key: "c1", groupKeys: ["c1"] },
      { key: "resto", groupKeys: ["gone"] },
    ]);
  });

  it("rounds shares like the group list and widths so they fill the bar exactly", () => {
    const segments = segmentsOf([
      movement("SENT", 1_000, category("c0")),
      movement("SENT", 1_000, category("c1")),
      movement("SENT", 1_000, category("c2")),
    ]);

    expect(segments.map((segment) => segment.percent)).toEqual([33, 33, 33]);
    expect(segments.map((segment) => segment.width)).toEqual([33.3333, 33.3333, 33.3334]);
    expect(segments.reduce((total, segment) => total + segment.width, 0)).toBeCloseTo(100, 10);
  });

  it("prints the share only on segments wide enough for it", () => {
    const segments = segmentsOf([
      movement("SENT", 8_800, category("c0")),
      movement("SENT", 1_200, category("c1")),
    ]);
    const thin = segmentsOf([
      movement("SENT", 8_900, category("c0")),
      movement("SENT", 1_100, category("c1")),
    ]);

    expect(segments.map((segment) => segment.showLabel)).toEqual([true, true]);
    expect(thin.map((segment) => segment.showLabel)).toEqual([true, false]);
  });
});

describe("budgetProgress", () => {
  it("fills part of the budget while within it, with no excess or marker", () => {
    expect(budgetProgress(BigInt(2_500), BigInt(10_000))).toEqual({
      withinPercent: 25,
      excessPercent: 0,
      markerPercent: null,
    });
  });

  it("draws nothing filled when nothing was spent", () => {
    expect(budgetProgress(BigInt(0), BigInt(10_000))).toEqual({
      withinPercent: 0,
      excessPercent: 0,
      markerPercent: null,
    });
  });

  it("fills the whole bar when exactly at the budget", () => {
    expect(budgetProgress(BigInt(10_000), BigInt(10_000))).toEqual({
      withinPercent: 100,
      excessPercent: 0,
      markerPercent: null,
    });
  });

  it("spans what was spent when over, with the budget up to the marker and the excess after", () => {
    expect(budgetProgress(BigInt(12_500), BigInt(10_000))).toEqual({
      withinPercent: 80,
      excessPercent: 20,
      markerPercent: 80,
    });
    expect(budgetProgress(BigInt(30_000), BigInt(10_000))).toEqual({
      withinPercent: 33.3333,
      excessPercent: 66.6667,
      markerPercent: 33.3333,
    });
  });
});

describe("existing month summary", () => {
  it("still groups, rounds shares and reports budget status as before", () => {
    const summary = summarizeSpending(
      [
        movement("SENT", 2_000, category("c0", "Comida")),
        movement("SERVICE_PAYMENT", 1_000, null),
        movement("EXCHANGE", 9_000, null),
      ],
      [{ id: "b1", categoryId: "c0", category: { name: "Comida" }, amountCents: BigInt(1_500) }],
    );

    expect(summary.totalCents).toBe(BigInt(3_000));
    expect(summary.groups.map(({ key, name, totalCents, percent, count }) => ({ key, name, totalCents, percent, count }))).toEqual([
      { key: "c0", name: "Comida", totalCents: BigInt(2_000), percent: 67, count: 1 },
      { key: "sin-categoria", name: "Sin categoría", totalCents: BigInt(1_000), percent: 33, count: 1 },
    ]);
    expect(summary.groups[0].budget?.status).toEqual({ kind: "over", cents: BigInt(500) });
    expect(budgetStatus(BigInt(1_500), BigInt(1_500))).toEqual({ kind: "available", cents: BigInt(0) });
    expect(summary.budgeted).toEqual({ budgetCents: BigInt(1_500), spentCents: BigInt(2_000) });
  });
});
