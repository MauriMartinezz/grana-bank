import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
  setMovementCategory,
} from "./categories";
import { defaultCategoryRows } from "./names";

const EMAILS = ["owner@categories.test", "stranger@categories.test"];

async function createUser(email: string, alias: string) {
  return db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      categories: { create: defaultCategoryRows() },
      accounts: {
        create: {
          currency: "ARS",
          alias,
          balanceCents: 0,
          movements: {
            create: {
              type: "RECEIVED",
              counterparty: "Someone",
              amountCents: 100,
              reference: "TRF-999999",
              occurredAt: new Date("2026-11-01T12:00:00Z"),
            },
          },
        },
      },
    },
    include: { categories: true, accounts: { include: { movements: true } } },
  });
}

let owner: Awaited<ReturnType<typeof createUser>>;
let stranger: Awaited<ReturnType<typeof createUser>>;
const categoryOf = (user: typeof owner, name: string) =>
  user.categories.find((category) => category.name === name)!.id;
const movementOf = (user: typeof owner) => user.accounts[0].movements[0].id;

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0], "owner.categories");
  stranger = await createUser(EMAILS[1], "stranger.categories");
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("listCategories", () => {
  it("lists only the user's categories, by name", async () => {
    const categories = await listCategories(owner.id);

    expect(categories.map((category) => category.name)).toEqual([
      "Alquiler",
      "Comida",
      "Otros",
      "Regalos",
      "Servicios",
    ]);
    const strangerIds = stranger.categories.map((category) => category.id);
    expect(categories.some((category) => strangerIds.includes(category.id))).toBe(false);
  });
});

describe("createCategory", () => {
  it("creates a trimmed category", async () => {
    const result = await createCategory(owner.id, "  Educación ");

    expect(result.ok).toBe(true);
    expect((await listCategories(owner.id)).map((category) => category.name)).toContain(
      "Educación",
    );
  });

  it("rejects a name the user already has in any case, but not another user's", async () => {
    await createCategory(stranger.id, "Viajes");

    expect(await createCategory(owner.id, "COMIDA")).toEqual({
      ok: false,
      error: "Ya tenés una categoría con ese nombre.",
    });
    expect((await createCategory(owner.id, "viajes")).ok).toBe(true);
  });

  it("rejects an empty or too long name and saves nothing", async () => {
    expect(await createCategory(owner.id, " ")).toEqual({
      ok: false,
      error: "Escribí un nombre para la categoría.",
    });
    expect((await createCategory(owner.id, "x".repeat(31))).ok).toBe(false);
    expect(await listCategories(owner.id)).toHaveLength(5);
  });
});

describe("renameCategory", () => {
  it("renames the user's category, also to another case of its own name", async () => {
    const id = categoryOf(owner, "Comida");

    expect(await renameCategory(owner.id, id, "Supermercado")).toEqual({ ok: true });
    expect(await renameCategory(owner.id, id, "SUPERMERCADO")).toEqual({ ok: true });
    expect((await db.category.findUniqueOrThrow({ where: { id } })).name).toBe("SUPERMERCADO");
  });

  it("rejects a name taken by another of the user's categories", async () => {
    expect(await renameCategory(owner.id, categoryOf(owner, "Comida"), "otros")).toEqual({
      ok: false,
      error: "Ya tenés una categoría con ese nombre.",
    });
  });

  it("never renames another user's category", async () => {
    const id = categoryOf(stranger, "Comida");

    expect(await renameCategory(owner.id, id, "Mía")).toEqual({
      ok: false,
      error: "Esta categoría ya no está disponible.",
    });
    expect((await db.category.findUniqueOrThrow({ where: { id } })).name).toBe("Comida");
  });
});

describe("deleteCategory", () => {
  it("deletes the user's category and leaves its movements uncategorized", async () => {
    const id = categoryOf(owner, "Regalos");
    await setMovementCategory(owner.id, movementOf(owner), id);

    expect(await deleteCategory(owner.id, id)).toEqual({ ok: true });
    expect(await db.category.findUnique({ where: { id } })).toBeNull();
    const movement = await db.movement.findUniqueOrThrow({ where: { id: movementOf(owner) } });
    expect(movement.categoryId).toBeNull();
  });

  it("never deletes another user's category", async () => {
    const id = categoryOf(stranger, "Regalos");

    expect(await deleteCategory(owner.id, id)).toEqual({
      ok: false,
      error: "Esta categoría ya no está disponible.",
    });
    expect(await db.category.findUnique({ where: { id } })).not.toBeNull();
  });
});

describe("setMovementCategory", () => {
  it("sets and clears the category of the user's movement", async () => {
    const id = categoryOf(owner, "Alquiler");

    expect(await setMovementCategory(owner.id, movementOf(owner), id)).toEqual({ ok: true });
    expect(
      (await db.movement.findUniqueOrThrow({ where: { id: movementOf(owner) } })).categoryId,
    ).toBe(id);
    expect(await setMovementCategory(owner.id, movementOf(owner), null)).toEqual({ ok: true });
    expect(
      (await db.movement.findUniqueOrThrow({ where: { id: movementOf(owner) } })).categoryId,
    ).toBeNull();
  });

  it("rejects another user's movement or category and changes nothing", async () => {
    expect(
      await setMovementCategory(owner.id, movementOf(stranger), categoryOf(owner, "Comida")),
    ).toEqual({ ok: false, error: "Este movimiento ya no está disponible." });
    expect(
      await setMovementCategory(owner.id, movementOf(owner), categoryOf(stranger, "Comida")),
    ).toEqual({ ok: false, error: "Esta categoría ya no está disponible." });
    const movements = await db.movement.findMany({
      where: { id: { in: [movementOf(owner), movementOf(stranger)] } },
    });
    expect(movements.every((movement) => movement.categoryId === null)).toBe(true);
  });
});
