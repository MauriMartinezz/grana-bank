import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { TEST_ACCOUNT } from "./test-account";

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

const { confirmDeposit, reviewDeposit } = await import("./actions");

const EMAIL = "owner@deposits-actions.test";
let ars: string;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function message(promise: Promise<unknown>) {
  return promise.then(
    (value) => value,
    (error: Error) => error.message,
  );
}

beforeAll(async () => {
  // Same as the seed; never deleted here.
  if (!(await db.user.findUnique({ where: { email: TEST_ACCOUNT.email } }))) {
    await db.user.create({
      data: {
        email: TEST_ACCOUNT.email,
        firstName: TEST_ACCOUNT.firstName,
        lastName: "",
        passwordHash: "!",
        isTestAccount: true,
        accounts: {
          create: TEST_ACCOUNT.accounts.map(({ currency, alias }) => ({
            currency,
            alias,
            balanceCents: TEST_ACCOUNT.balanceCents,
          })),
        },
      },
    });
  }
});

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  const user = await db.user.create({
    data: {
      email: EMAIL,
      firstName: "Owner",
      lastName: "",
      passwordHash: "!",
      accounts: { create: { currency: "ARS", alias: "owner.depositsactions", balanceCents: 0 } },
    },
    include: { accounts: true },
  });
  current.user = { id: user.id, name: "Owner" };
  ars = user.accounts[0].id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
});

describe("reviewDeposit", () => {
  it("goes to the confirmation with the currency, the amount in cents and a key", async () => {
    const result = (await message(
      reviewDeposit(undefined, form({ currency: "ARS", amount: "1.500,50" })),
    )) as string;

    expect(result).toMatch(
      /^REDIRECT:\/ingresar-dinero\/confirmar\?currency=ARS&amount=150050&key=[0-9a-f-]{36}$/,
    );
  });

  it.each([
    ["", "Ingresá un monto."],
    ["abc", "Ingresá un monto mayor a cero, con hasta 2 decimales."],
  ])("rejects the amount %j", async (amount, error) => {
    expect(await reviewDeposit(undefined, form({ currency: "ARS", amount }))).toEqual({
      value: amount,
      currency: "ARS",
      error,
    });
  });

  it("takes up to USD 10.000 per deposit", async () => {
    expect(await reviewDeposit(undefined, form({ currency: "USD", amount: "10.000,01" }))).toEqual({
      value: "10.000,01",
      currency: "USD",
      error: `Podés ingresar hasta ${formatMoney(1_000_000, "USD")} por vez.`,
    });
  });

  it("needs an account in the chosen currency", async () => {
    expect(await reviewDeposit(undefined, form({ currency: "USD", amount: "10" }))).toEqual({
      value: "10",
      currency: "USD",
      error: "No tenés una cuenta en dólares.",
    });
  });
});

describe("confirmDeposit", () => {
  it("deposits and goes to the receipt of the received movement", async () => {
    const result = (await message(
      confirmDeposit(
        undefined,
        form({ currency: "ARS", amountCents: "150050", idempotencyKey: randomUUID() }),
      ),
    )) as string;

    const movementId = result.replace("REDIRECT:/ingresar-dinero/comprobante/", "");
    const movement = await db.movement.findUniqueOrThrow({ where: { id: movementId } });
    expect(movement).toMatchObject({ accountId: ars, type: "RECEIVED", amountCents: BigInt(150050) });
    expect((await db.account.findUniqueOrThrow({ where: { id: ars } })).balanceCents).toBe(
      BigInt(150050),
    );
  });

  it("rejects a malformed key or amount without moving money", async () => {
    expect(
      await confirmDeposit(
        undefined,
        form({ currency: "ARS", amountCents: "100", idempotencyKey: "nope" }),
      ),
    ).toEqual({ error: "La operación expiró. Volvé a intentarlo." });
    expect(
      await confirmDeposit(
        undefined,
        form({ currency: "ARS", amountCents: "1e3", idempotencyKey: randomUUID() }),
      ),
    ).toEqual({ error: "El monto no es válido. Volvé a ingresarlo." });
    expect((await db.account.findUniqueOrThrow({ where: { id: ars } })).balanceCents).toBe(
      BigInt(0),
    );
  });
});
