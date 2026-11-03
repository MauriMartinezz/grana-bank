import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { defaultCategoryRows } from "./names";

const current = vi.hoisted(() => ({ user: { id: "", name: "" } }));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/current-user", () => ({
  getCurrentUser: async () => current.user,
}));

const {
  addCategory,
  changeMovementCategory,
  removeCategory,
  saveCategoryName,
} = await import("./actions");

const EMAILS = ["owner@categories-actions.test", "stranger@categories-actions.test"];

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

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
          alias,
          balanceCents: 0,
          movements: {
            create: {
              type: "TOP_UP",
              counterparty: "Carga SUBE",
              amountCents: 100,
              reference: "RC-000001",
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
const namesOf = async (userId: string) =>
  (await db.category.findMany({ where: { userId }, orderBy: { key: "asc" } })).map((c) => c.name);

beforeEach(async () => {
  vi.mocked(revalidatePath).mockClear();
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0], "owner.categoriesactions");
  stranger = await createUser(EMAILS[1], "stranger.categoriesactions");
  current.user = { id: owner.id, name: "Owner" };
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("addCategory", () => {
  it("adds a category and says so", async () => {
    expect(await addCategory(undefined, form({ name: "Viajes" }))).toEqual({
      notice: "Agregamos Viajes.",
    });
    expect(await namesOf(owner.id)).toContain("Viajes");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("keeps the typed name with the error", async () => {
    expect(await addCategory(undefined, form({ name: "comida" }))).toEqual({
      error: "Ya tenés una categoría con ese nombre.",
      value: "comida",
    });
  });
});

describe("saveCategoryName", () => {
  it("renames the user's category", async () => {
    expect(
      await saveCategoryName(
        undefined,
        form({ categoryId: categoryOf(owner, "Comida"), name: "Supermercado" }),
      ),
    ).toEqual({ notice: "Guardamos Supermercado." });
    expect(await namesOf(owner.id)).toContain("Supermercado");
  });

  it("never renames another user's category", async () => {
    expect(
      await saveCategoryName(
        undefined,
        form({ categoryId: categoryOf(stranger, "Comida"), name: "Mía" }),
      ),
    ).toEqual({ error: "Esta categoría ya no está disponible.", value: "Mía" });
    expect(await namesOf(stranger.id)).toContain("Comida");
  });
});

describe("removeCategory", () => {
  it("deletes the user's category and returns to the list", async () => {
    await expect(
      removeCategory(form({ categoryId: categoryOf(owner, "Regalos") })),
    ).rejects.toThrow("REDIRECT:/perfil/categorias");
    expect(await namesOf(owner.id)).not.toContain("Regalos");
  });

  it("never deletes another user's category", async () => {
    await expect(
      removeCategory(form({ categoryId: categoryOf(stranger, "Regalos") })),
    ).rejects.toThrow("REDIRECT:/perfil/categorias");
    expect(await namesOf(stranger.id)).toContain("Regalos");
  });
});

describe("changeMovementCategory", () => {
  it("sets the category of any of the user's movements, a top-up included", async () => {
    const categoryId = categoryOf(owner, "Otros");

    expect(
      await changeMovementCategory(
        undefined,
        form({ movementId: movementOf(owner), categoryId }),
      ),
    ).toEqual({ notice: "Categoría guardada." });
    expect(
      (await db.movement.findUniqueOrThrow({ where: { id: movementOf(owner) } })).categoryId,
    ).toBe(categoryId);
  });

  it("clears it with an empty category", async () => {
    await db.movement.update({
      where: { id: movementOf(owner) },
      data: { categoryId: categoryOf(owner, "Otros") },
    });

    expect(
      await changeMovementCategory(
        undefined,
        form({ movementId: movementOf(owner), categoryId: "" }),
      ),
    ).toEqual({ notice: "Categoría guardada." });
    expect(
      (await db.movement.findUniqueOrThrow({ where: { id: movementOf(owner) } })).categoryId,
    ).toBeNull();
  });

  it("rejects another user's movement or category", async () => {
    expect(
      await changeMovementCategory(
        undefined,
        form({ movementId: movementOf(stranger), categoryId: categoryOf(owner, "Otros") }),
      ),
    ).toEqual({ error: "Este movimiento ya no está disponible." });
    expect(
      await changeMovementCategory(
        undefined,
        form({ movementId: movementOf(owner), categoryId: categoryOf(stranger, "Otros") }),
      ),
    ).toEqual({ error: "Esta categoría ya no está disponible." });
  });
});
