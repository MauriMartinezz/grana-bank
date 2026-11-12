import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

type StoredCookie = { value: string; options: Record<string, unknown> };

const jar = vi.hoisted(() => new Map<string, StoredCookie>());

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const cookie = jar.get(name);
      return cookie && { name, value: cookie.value };
    },
    set: (name: string, value: string, options: Record<string, unknown>) => {
      jar.set(name, { value, options });
    },
    delete: (name: string) => {
      jar.delete(name);
    },
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
  unstable_rethrow: () => {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { removeBudget, saveBudget } = await import("./actions");
const { createSession } = await import("@/features/auth/session");

const EMAILS = ["owner@finances-actions.test", "stranger@finances-actions.test"];

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function createUser(email: string) {
  return db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      categories: {
        create: [
          { name: "Comida", key: "comida" },
          { name: "Regalos", key: "regalos" },
        ],
      },
    },
    include: { categories: true },
  });
}

let owner: Awaited<ReturnType<typeof createUser>>;
let stranger: Awaited<ReturnType<typeof createUser>>;

const categoryOf = (user: typeof owner, name: string) =>
  user.categories.find((category) => category.name === name)!.id;
const budgetsOf = (userId: string) =>
  db.budget.findMany({
    where: { userId },
    orderBy: [{ currency: "asc" }, { categoryId: "asc" }],
    select: { categoryId: true, currency: true, amountCents: true },
  });
const save = (fields: Record<string, string>) =>
  saveBudget(undefined, form(fields)).catch((error: Error) => error.message);
const remove = (fields: Record<string, string>) =>
  removeBudget(undefined, form(fields)).catch((error: Error) => error.message);

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0]);
  stranger = await createUser(EMAILS[1]);
  await createSession(owner.id, false);
});

afterEach(() => {
  jar.clear();
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("saveBudget", () => {
  it("sets the budget of one of the user's categories in a currency", async () => {
    const categoryId = categoryOf(owner, "Comida");

    expect(await save({ categoryId, currency: "ARS", amount: "150.000" })).toEqual({
      notice: "Guardamos el presupuesto de Comida.",
    });
    expect(await budgetsOf(owner.id)).toEqual([
      { categoryId, currency: "ARS", amountCents: BigInt(15_000_000) },
    ]);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("changes the existing budget instead of adding another one", async () => {
    const categoryId = categoryOf(owner, "Comida");
    await save({ categoryId, currency: "ARS", amount: "1.000" });

    expect(await save({ categoryId, currency: "ARS", amount: "2.500,50" })).toEqual({
      notice: "Guardamos el presupuesto de Comida.",
    });
    expect(await budgetsOf(owner.id)).toEqual([
      { categoryId, currency: "ARS", amountCents: BigInt(250_050) },
    ]);
  });

  it("keeps a budget per currency", async () => {
    const categoryId = categoryOf(owner, "Comida");
    await save({ categoryId, currency: "ARS", amount: "1.000" });
    await save({ categoryId, currency: "USD", amount: "50" });

    expect(await budgetsOf(owner.id)).toEqual([
      { categoryId, currency: "ARS", amountCents: BigInt(100_000) },
      { categoryId, currency: "USD", amountCents: BigInt(5_000) },
    ]);
  });

  it.each([
    ["", "Ingresá un monto."],
    ["0", "Ingresá un monto mayor a cero, con hasta 2 decimales."],
    ["-5", "Ingresá un monto mayor a cero, con hasta 2 decimales."],
    ["12.5", "Ingresá un monto mayor a cero, con hasta 2 decimales."],
  ])("rejects the amount %j, keeps what was typed and saves nothing", async (amount, error) => {
    expect(await save({ categoryId: categoryOf(owner, "Comida"), currency: "ARS", amount })).toEqual({
      error,
      value: amount,
    });
    expect(await budgetsOf(owner.id)).toEqual([]);
  });

  it("rejects an unknown currency and saves nothing", async () => {
    expect(
      await save({ categoryId: categoryOf(owner, "Comida"), currency: "EUR", amount: "1.000" }),
    ).toEqual({ error: "Elegí una cuenta en pesos o en dólares.", value: "1.000" });
    expect(await budgetsOf(owner.id)).toEqual([]);
  });

  it("never uses another user's category", async () => {
    expect(
      await save({ categoryId: categoryOf(stranger, "Comida"), currency: "ARS", amount: "1.000" }),
    ).toEqual({ error: "Esta categoría ya no está disponible.", value: "1.000" });
    expect(await budgetsOf(owner.id)).toEqual([]);
    expect(await budgetsOf(stranger.id)).toEqual([]);
  });

  it("never changes another user's budget", async () => {
    const categoryId = categoryOf(stranger, "Comida");
    await db.budget.create({
      data: { userId: stranger.id, categoryId, currency: "ARS", amountCents: 9_000 },
    });

    expect(await save({ categoryId, currency: "ARS", amount: "1" })).toEqual({
      error: "Esta categoría ya no está disponible.",
      value: "1",
    });
    expect(await budgetsOf(stranger.id)).toEqual([
      { categoryId, currency: "ARS", amountCents: BigInt(9_000) },
    ]);
  });

  it("refuses an anonymous request and saves nothing", async () => {
    jar.clear();

    expect(
      await save({ categoryId: categoryOf(owner, "Comida"), currency: "ARS", amount: "1.000" }),
    ).toBe("REDIRECT:/ingresar");
    expect(await budgetsOf(owner.id)).toEqual([]);
  });
});

describe("removeBudget", () => {
  it("removes one of the user's budgets", async () => {
    const budget = await db.budget.create({
      data: { userId: owner.id, categoryId: categoryOf(owner, "Comida"), currency: "ARS", amountCents: 9_000 },
    });

    expect(await remove({ budgetId: budget.id })).toEqual({
      notice: "Quitamos el presupuesto de Comida.",
    });
    expect(await budgetsOf(owner.id)).toEqual([]);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("never removes another user's budget", async () => {
    const categoryId = categoryOf(stranger, "Comida");
    const budget = await db.budget.create({
      data: { userId: stranger.id, categoryId, currency: "ARS", amountCents: 9_000 },
    });

    expect(await remove({ budgetId: budget.id })).toEqual({
      error: "Este presupuesto ya no está disponible.",
    });
    expect(await budgetsOf(stranger.id)).toEqual([
      { categoryId, currency: "ARS", amountCents: BigInt(9_000) },
    ]);
  });

  it("refuses an anonymous request and removes nothing", async () => {
    const categoryId = categoryOf(owner, "Comida");
    const budget = await db.budget.create({
      data: { userId: owner.id, categoryId, currency: "ARS", amountCents: 9_000 },
    });
    jar.clear();

    expect(await remove({ budgetId: budget.id })).toBe("REDIRECT:/ingresar");
    expect(await budgetsOf(owner.id)).toEqual([
      { categoryId, currency: "ARS", amountCents: BigInt(9_000) },
    ]);
  });
});
