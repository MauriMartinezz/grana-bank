import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  unstable_rethrow: () => {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createPromotion } = await import("./actions");
const { requireAdmin } = await import("./guard");
const { login } = await import("@/features/auth/actions");
const { redirectIfSignedIn } = await import("@/features/auth/current-user");
const { hashPassword } = await import("@/features/auth/password");
const { createSession } = await import("@/features/auth/session");

const ADMIN_EMAIL = "admin@admin-actions.test";
const USER_EMAIL = "user@admin-actions.test";
const PASSWORD = "Fixture-Pass1@";
// Test promotions carry this merchant prefix, so seeded ones never get in the way.
const PREFIX = "Prueba admin";

let adminId: string;
let userId: string;

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(name, item);
  }
  return data;
}

function promotionForm(fields: Record<string, string | string[]> = {}) {
  return form({
    bank: "Banco Ceibo",
    cardBrand: "AMEX",
    merchant: `${PREFIX} Librería`,
    category: "ROPA",
    weekdays: ["2", "6"],
    percent: "10",
    cap: "10.000",
    minimum: "5.000",
    validFrom: "2026-11-01",
    validUntil: "2026-11-30",
    conditions: "En libros y papelería.",
    ...fields,
  });
}

const submit = (fields: Record<string, string | string[]> = {}) =>
  createPromotion(undefined, promotionForm(fields)).catch((error: Error) => error.message);

const mine = () =>
  db.promotion.findMany({ where: { merchant: { startsWith: PREFIX } }, orderBy: { merchant: "asc" } });

async function signInAs(id: string) {
  await createSession(id, false);
}

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, USER_EMAIL] } } });
  const passwordHash = await hashPassword(PASSWORD);
  const admin = await db.user.create({
    data: { email: ADMIN_EMAIL, firstName: "Admin", lastName: "", passwordHash, role: "ADMIN" },
  });
  const user = await db.user.create({
    data: { email: USER_EMAIL, firstName: "Ana", lastName: "Pérez", passwordHash },
  });
  adminId = admin.id;
  userId = user.id;
});

afterEach(async () => {
  jar.clear();
  await db.session.deleteMany({ where: { userId: { in: [adminId, userId] } } });
  await db.promotion.deleteMany({ where: { merchant: { startsWith: PREFIX } } });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, USER_EMAIL] } } });
});

describe("createPromotion", () => {
  it("lets an admin create a promotion with every field and goes back to the list", async () => {
    await signInAs(adminId);

    expect(await submit()).toBe("REDIRECT:/admin/promociones");

    const rows = await mine();
    expect(rows).toHaveLength(1);
    const { id, ...stored } = rows[0];
    expect(id).toEqual(expect.any(String));
    expect(stored).toEqual({
      bank: "Banco Ceibo",
      cardBrand: "AMEX",
      merchant: `${PREFIX} Librería`,
      category: "ROPA",
      weekdays: [2, 6],
      percent: 10,
      capCents: BigInt(1_000_000),
      minPurchaseCents: BigInt(500_000),
      validFrom: new Date("2026-11-01T00:00:00Z"),
      validUntil: new Date("2026-11-30T00:00:00Z"),
      conditions: "En libros y papelería.",
    });
  });

  it("stores a promotion for every card with no cap and no minimum", async () => {
    await signInAs(adminId);

    expect(
      await submit({ bank: "", cardBrand: "TODAS", noCap: "on", cap: "", noMinimum: "on", minimum: "" }),
    ).toBe("REDIRECT:/admin/promociones");

    expect(await mine()).toEqual([
      expect.objectContaining({ bank: null, cardBrand: null, capCents: null, minPurchaseCents: null }),
    ]);
  });

  it("returns the typed values with the errors and stores nothing", async () => {
    await signInAs(adminId);

    const state = await submit({ percent: "150", weekdays: [] });

    expect(state).toEqual({
      values: {
        bank: "Banco Ceibo",
        cardBrand: "AMEX",
        merchant: `${PREFIX} Librería`,
        category: "ROPA",
        weekdays: [],
        percent: "150",
        cap: "10.000",
        noCap: false,
        minimum: "5.000",
        noMinimum: false,
        validFrom: "2026-11-01",
        validUntil: "2026-11-30",
        conditions: "En libros y papelería.",
      },
      errors: {
        weekdays: "Elegí al menos un día.",
        percent: "Ingresá un porcentaje entero entre 1 y 100.",
      },
    });
    expect(await mine()).toEqual([]);
  });

  it("refuses a regular user and stores nothing", async () => {
    await signInAs(userId);

    expect(await submit()).toBe("NOT_FOUND");
    expect(await mine()).toEqual([]);
  });

  it("refuses an anonymous request and stores nothing", async () => {
    expect(await submit()).toBe("REDIRECT:/ingresar");
    expect(await mine()).toEqual([]);
  });

  it("reports a database failure instead of crashing", async () => {
    await signInAs(adminId);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const create = vi.spyOn(db.promotion, "create").mockRejectedValueOnce(new Error("offline"));
    try {
      expect(await submit()).toMatchObject({
        errors: { form: "No pudimos crear la promoción. Probá de nuevo." },
      });
    } finally {
      create.mockRestore();
      vi.mocked(console.error).mockRestore();
    }
  });
});

describe("requireAdmin", () => {
  it("returns the admin", async () => {
    await signInAs(adminId);
    await expect(requireAdmin()).resolves.toMatchObject({ id: adminId, role: "ADMIN" });
  });

  it("hides the admin view from a regular user", async () => {
    await signInAs(userId);
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
  });

  it("sends a visitor without a session to login", async () => {
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/ingresar");
  });
});

describe("signing in as admin", () => {
  it("opens the admin view after login", async () => {
    await expect(
      login(undefined, form({ email: ADMIN_EMAIL, password: PASSWORD })),
    ).rejects.toThrow("REDIRECT:/admin/promociones");
  });

  it("keeps sending a regular user to home", async () => {
    await expect(
      login(undefined, form({ email: USER_EMAIL, password: PASSWORD })),
    ).rejects.toThrow("REDIRECT:/inicio");
  });

  it("skips the login form to the admin view for a signed-in admin", async () => {
    await signInAs(adminId);
    await expect(redirectIfSignedIn()).rejects.toThrow("REDIRECT:/admin/promociones");
  });
});
