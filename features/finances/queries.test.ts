import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MovementType } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { listBudgets, listCategoryOrder, listMonthMovements } from "./queries";

const EMAILS = ["owner@finances-queries.test", "stranger@finances-queries.test"];

let ownerId: string;
let strangerId: string;

function row(type: MovementType, reference: string, occurredAt: string, amountCents = 1_000) {
  return { type, counterparty: reference, amountCents, reference, occurredAt: new Date(occurredAt) };
}

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const owner = await db.user.create({
    data: {
      email: EMAILS[0],
      firstName: "Owner",
      lastName: "",
      passwordHash: "!",
      categories: { create: [{ name: "Comida", key: "comida" }] },
      accounts: {
        create: [
          {
            alias: "owner.financesqueries",
            currency: "ARS",
            balanceCents: 0,
            movements: {
              create: [
                // November 2026 in Buenos Aires: from 03:00 UTC on the 1st.
                row("SENT", "in-nov-start", "2026-11-01T03:00:00Z"),
                row("TOP_UP", "in-nov-end", "2026-12-01T02:59:59Z"),
                row("SERVICE_PAYMENT", "in-nov-payment", "2026-11-10T12:00:00Z"),
                row("SUBSCRIPTION", "in-nov-subscription", "2026-11-11T12:00:00Z"),
                row("SENT", "before-nov", "2026-11-01T02:59:59Z"),
                row("SENT", "after-nov", "2026-12-01T03:00:00Z"),
                row("RECEIVED", "received", "2026-11-05T12:00:00Z"),
                row("EXCHANGE", "exchange", "2026-11-05T13:00:00Z"),
              ],
            },
          },
          {
            alias: "owner.financesqueries.usd",
            currency: "USD",
            balanceCents: 0,
            movements: { create: [row("SENT", "usd-nov", "2026-11-05T12:00:00Z")] },
          },
        ],
      },
    },
    include: { categories: true },
  });
  ownerId = owner.id;
  await db.budget.create({
    data: { userId: ownerId, categoryId: owner.categories[0].id, currency: "ARS", amountCents: 5_000 },
  });
  await db.budget.create({
    data: { userId: ownerId, categoryId: owner.categories[0].id, currency: "USD", amountCents: 700 },
  });

  const stranger = await db.user.create({
    data: {
      email: EMAILS[1],
      firstName: "Stranger",
      lastName: "",
      passwordHash: "!",
      categories: { create: [{ name: "Comida", key: "comida" }] },
      accounts: {
        create: {
          alias: "stranger.financesqueries",
          currency: "ARS",
          balanceCents: 0,
          movements: { create: [row("SENT", "stranger-nov", "2026-11-05T12:00:00Z")] },
        },
      },
    },
    include: { categories: true },
  });
  strangerId = stranger.id;
  await db.budget.create({
    data: { userId: strangerId, categoryId: stranger.categories[0].id, currency: "ARS", amountCents: 9_000 },
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("listMonthMovements", () => {
  it("lists only the user's movements in the chosen currency and Buenos Aires month, newest first", async () => {
    const movements = await listMonthMovements(ownerId, "ARS", "2026-11");

    expect(movements.map((m) => m.reference)).toEqual([
      "in-nov-end",
      "in-nov-subscription",
      "in-nov-payment",
      "exchange",
      "received",
      "in-nov-start",
    ]);
    expect(movements[0]).toMatchObject({ account: { currency: "ARS" }, category: null });
  });

  it("lists the dollar account's spending apart", async () => {
    expect((await listMonthMovements(ownerId, "USD", "2026-11")).map((m) => m.reference)).toEqual([
      "usd-nov",
    ]);
  });

  it("never lists another user's movements", async () => {
    expect((await listMonthMovements(strangerId, "ARS", "2026-11")).map((m) => m.reference)).toEqual([
      "stranger-nov",
    ]);
  });
});

describe("listBudgets", () => {
  it("lists only the user's budgets in the chosen currency, with the category name", async () => {
    expect(await listBudgets(ownerId, "ARS")).toEqual([
      expect.objectContaining({
        currency: "ARS",
        amountCents: BigInt(5_000),
        category: expect.objectContaining({ name: "Comida" }),
      }),
    ]);
    expect((await listBudgets(strangerId, "ARS")).map((b) => b.amountCents)).toEqual([BigInt(9_000)]);
  });
});

describe("listCategoryOrder", () => {
  it("lists only the user's category ids, oldest first, whatever their names", async () => {
    const created = [];
    for (const [index, name] of ["Zapatos", "Alquiler"].entries()) {
      created.push(
        await db.category.create({
          data: { userId: ownerId, name, key: name.toLowerCase(), createdAt: new Date(Date.UTC(2030, 0, index + 1)) },
        }),
      );
    }
    const [first] = await db.category.findMany({ where: { userId: ownerId, key: "comida" } });

    expect(await listCategoryOrder(ownerId)).toEqual([first.id, created[0].id, created[1].id]);
    expect(await listCategoryOrder(strangerId)).toHaveLength(1);
  });
});
