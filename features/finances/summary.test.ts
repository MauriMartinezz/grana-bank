import { describe, expect, it } from "vitest";
import type { MovementType } from "@/generated/prisma/client";
import { budgetStatus, budgetStatusLabel, summarizeMonth, summarizeSpending } from "./summary";

let sequence = 0;

function movement(
  type: MovementType,
  amountCents: number,
  category: { id: string; name: string } | null,
  occurredAt = "2026-11-05T15:00:00Z",
) {
  sequence += 1;
  return {
    id: `m${sequence}`,
    type,
    amountCents: BigInt(amountCents),
    occurredAt: new Date(occurredAt),
    category,
  };
}

const FOOD = { id: "c-food", name: "Comida" };
const RENT = { id: "c-rent", name: "Alquiler" };
const GIFTS = { id: "c-gifts", name: "Regalos" };

describe("summarizeSpending", () => {
  it("counts only spending: received money and dollar exchanges stay out", () => {
    const summary = summarizeSpending(
      [
        movement("RECEIVED", 50_000, FOOD),
        movement("EXCHANGE", 70_000, null),
        movement("SENT", 1_000, FOOD),
      ],
      [],
    );

    expect(summary.totalCents).toBe(BigInt(1_000));
    expect(summary.groups).toHaveLength(1);
    expect(summary.groups[0]).toMatchObject({ name: "Comida", totalCents: BigInt(1_000), count: 1 });
  });

  it("puts movements with no category under Sin categoría", () => {
    const summary = summarizeSpending(
      [movement("TOP_UP", 2_000, null), movement("SERVICE_PAYMENT", 3_000, null)],
      [],
    );

    expect(summary.groups).toEqual([
      expect.objectContaining({
        key: "sin-categoria",
        categoryId: null,
        name: "Sin categoría",
        totalCents: BigInt(5_000),
        count: 2,
        percent: 100,
        budget: null,
      }),
    ]);
  });

  it("groups a categorized transfer, payment, top-up and subscription together", () => {
    const summary = summarizeSpending(
      [
        movement("SENT", 1_000, FOOD),
        movement("SERVICE_PAYMENT", 2_000, FOOD),
        movement("TOP_UP", 3_000, FOOD),
        movement("SUBSCRIPTION", 4_000, FOOD),
      ],
      [],
    );

    expect(summary.groups).toHaveLength(1);
    expect(summary.groups[0]).toMatchObject({
      key: FOOD.id,
      categoryId: FOOD.id,
      name: "Comida",
      totalCents: BigInt(10_000),
      count: 4,
    });
  });

  it("orders groups by amount spent, highest first, with their share of the month", () => {
    const summary = summarizeSpending(
      [
        movement("SENT", 1_000, FOOD),
        movement("SENT", 6_000, RENT),
        movement("TOP_UP", 3_000, null),
      ],
      [],
    );

    expect(summary.totalCents).toBe(BigInt(10_000));
    expect(summary.groups.map((group) => [group.name, group.totalCents, group.percent])).toEqual([
      ["Alquiler", BigInt(6_000), 60],
      ["Sin categoría", BigInt(3_000), 30],
      ["Comida", BigInt(1_000), 10],
    ]);
  });

  it("keeps each group's movements newest first", () => {
    const summary = summarizeSpending(
      [
        movement("SENT", 1_000, FOOD, "2026-11-02T12:00:00Z"),
        movement("SENT", 1_000, FOOD, "2026-11-09T12:00:00Z"),
        movement("SENT", 1_000, FOOD, "2026-11-05T12:00:00Z"),
      ],
      [],
    );

    expect(summary.groups[0].movements.map((m) => m.occurredAt.toISOString())).toEqual([
      "2026-11-09T12:00:00.000Z",
      "2026-11-05T12:00:00.000Z",
      "2026-11-02T12:00:00.000Z",
    ]);
  });

  it("shows budgeted categories with nothing spent, all of it available", () => {
    const summary = summarizeSpending(
      [movement("SENT", 4_000, FOOD)],
      [
        { id: "b-food", categoryId: FOOD.id, category: FOOD, amountCents: BigInt(5_000) },
        { id: "b-gifts", categoryId: GIFTS.id, category: GIFTS, amountCents: BigInt(2_000) },
      ],
    );

    expect(summary.groups).toEqual([
      expect.objectContaining({
        name: "Comida",
        totalCents: BigInt(4_000),
        percent: 100,
        budget: {
          id: "b-food",
          amountCents: BigInt(5_000),
          status: { kind: "available", cents: BigInt(1_000) },
        },
      }),
      expect.objectContaining({
        name: "Regalos",
        totalCents: BigInt(0),
        count: 0,
        percent: 0,
        movements: [],
        budget: {
          id: "b-gifts",
          amountCents: BigInt(2_000),
          status: { kind: "available", cents: BigInt(2_000) },
        },
      }),
    ]);
    expect(summary.budgeted).toEqual({ budgetCents: BigInt(7_000), spentCents: BigInt(4_000) });
  });

  it("leaves unbudgeted spending out of the budget summary", () => {
    const summary = summarizeSpending(
      [movement("SENT", 9_000, FOOD), movement("SENT", 1_000, null)],
      [{ id: "b-food", categoryId: FOOD.id, category: FOOD, amountCents: BigInt(5_000) }],
    );

    expect(summary.budgeted).toEqual({ budgetCents: BigInt(5_000), spentCents: BigInt(9_000) });
    expect(summary.groups[0].budget?.status).toEqual({ kind: "over", cents: BigInt(4_000) });
  });

  it("has no budget summary and no groups for an empty month", () => {
    expect(summarizeSpending([], [])).toEqual({ totalCents: BigInt(0), groups: [], budgeted: null });
  });
});

describe("budgetStatus", () => {
  it("is available while spending stays within the budget, exactly equal included", () => {
    expect(budgetStatus(BigInt(3_000), BigInt(5_000))).toEqual({ kind: "available", cents: BigInt(2_000) });
    expect(budgetStatus(BigInt(5_000), BigInt(5_000))).toEqual({ kind: "available", cents: BigInt(0) });
  });

  it("is over when spending passes the budget", () => {
    expect(budgetStatus(BigInt(5_001), BigInt(5_000))).toEqual({ kind: "over", cents: BigInt(1) });
  });
});

describe("budgetStatusLabel", () => {
  it("says what is left or by how much the user went over", () => {
    expect(budgetStatusLabel({ kind: "available", cents: BigInt(250_000) }, "ARS")).toBe(
      "Disponible $2.500",
    );
    expect(budgetStatusLabel({ kind: "available", cents: BigInt(0) }, "ARS")).toBe("Disponible $0");
    expect(budgetStatusLabel({ kind: "over", cents: BigInt(1_250) }, "USD")).toBe(
      "Te pasaste por USD$12,50",
    );
  });
});

describe("summarizeMonth", () => {
  const SAVINGS = { id: "c-savings", name: "Ahorro" };

  it("totals ingresos and gastos with the difference, and keeps ingresos out of the gasto groups", () => {
    const summary = summarizeMonth(
      [
        movement("RECEIVED", 100_000, FOOD),
        movement("RECEIVED", 20_000, null),
        movement("SENT", 30_000, FOOD),
        movement("TOP_UP", 5_000, null),
        movement("EXCHANGE", 900_000, null),
      ],
      [],
    );

    expect(summary.incomeCents).toBe(BigInt(120_000));
    expect(summary.expenses.totalCents).toBe(BigInt(35_000));
    expect(summary.balanceCents).toBe(BigInt(85_000));
    expect(summary.expenses.groups.map((group) => [group.name, group.totalCents, group.count])).toEqual([
      ["Comida", BigInt(30_000), 1],
      ["Sin categoría", BigInt(5_000), 1],
    ]);
  });

  it("gives a negative difference when gastos pass ingresos", () => {
    const summary = summarizeMonth([movement("RECEIVED", 1_000, null), movement("SENT", 3_000, null)], []);

    expect(summary.balanceCents).toBe(BigInt(-2_000));
  });

  it("puts conversions in their own section, under their category or Conversión", () => {
    const summary = summarizeMonth(
      [
        movement("EXCHANGE", 150_000, null, "2026-11-03T12:00:00Z"),
        movement("EXCHANGE", 300_000, SAVINGS, "2026-11-04T12:00:00Z"),
        movement("EXCHANGE", 450_000, SAVINGS, "2026-11-08T12:00:00Z"),
        movement("SENT", 1_000, null),
      ],
      [],
    );

    expect(summary.conversions.map((group) => [group.key, group.categoryId, group.name, group.count])).toEqual([
      ["c-savings", "c-savings", "Ahorro", 2],
      ["conversion", null, "Conversión", 1],
    ]);
    expect(summary.conversions[0].movements.map((m) => m.amountCents)).toEqual([
      BigInt(450_000),
      BigInt(300_000),
    ]);
    expect(summary.incomeCents).toBe(BigInt(0));
    expect(summary.expenses.totalCents).toBe(BigInt(1_000));
    expect(summary.expenses.groups.map((group) => group.name)).toEqual(["Sin categoría"]);
  });

  it("is all zero and empty for an empty month", () => {
    expect(summarizeMonth([], [])).toEqual({
      incomeCents: BigInt(0),
      balanceCents: BigInt(0),
      expenses: { totalCents: BigInt(0), groups: [], budgeted: null },
      conversions: [],
    });
  });
});
