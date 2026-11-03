import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { deposit, findTestAccount } from "./deposit";
import { readDepositConfirmation, TEST_ACCOUNT } from "./test-account";

const EMAIL = "depositor@deposits.test";
let user: { id: string; ars: string };

async function balanceOf(accountId: string) {
  return (await db.account.findUniqueOrThrow({ where: { id: accountId } })).balanceCents;
}

beforeAll(async () => {
  // The seeded test account, created here when the database was not seeded.
  // Never deleted: the seed owns it.
  const existing = await db.user.findUnique({ where: { email: TEST_ACCOUNT.email } });
  if (!existing) {
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
  const created = await db.user.create({
    data: {
      email: EMAIL,
      firstName: "Depositor",
      lastName: "",
      passwordHash: "!",
      accounts: { create: { currency: "ARS", alias: "depositor.deposits", balanceCents: 0 } },
    },
    include: { accounts: true },
  });
  user = { id: created.id, ars: created.accounts[0].id };
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
});

describe("findTestAccount", () => {
  it("finds the test account of a currency with its name and alias", async () => {
    expect(await findTestAccount("ARS")).toMatchObject({
      name: "Cuenta de prueba",
      alias: "cuenta.prueba",
      currency: "ARS",
    });
    expect(await findTestAccount("USD")).toMatchObject({ alias: "cuenta.prueba.usd" });
  });
});

describe("deposit", () => {
  it("adds the money as a payment received from the test account", async () => {
    const result = await deposit({
      userId: user.id,
      currency: "ARS",
      amountCents: 150_000,
      idempotencyKey: randomUUID(),
    });

    if (!result.ok) throw new Error(result.error);
    expect(await balanceOf(user.ars)).toBe(BigInt(150_000));
    const movement = await db.movement.findUniqueOrThrow({ where: { id: result.movementId } });
    expect(movement).toMatchObject({
      accountId: user.ars,
      type: "RECEIVED",
      counterparty: "Cuenta de prueba",
      amountCents: BigInt(150_000),
    });
  });

  it("deposits once when the same key is replayed", async () => {
    const request = {
      userId: user.id,
      currency: "ARS" as const,
      amountCents: 100,
      idempotencyKey: randomUUID(),
    };

    const first = await deposit(request);
    const second = await deposit(request);

    expect(second).toEqual(first);
    expect(await balanceOf(user.ars)).toBe(BigInt(100));
  });

  it("takes up to $1.000.000 or USD 10.000 per deposit", async () => {
    const base = { userId: user.id, currency: "ARS" as const };
    expect(
      (await deposit({ ...base, amountCents: 100_000_000, idempotencyKey: randomUUID() })).ok,
    ).toBe(true);
    expect(
      await deposit({ ...base, amountCents: 100_000_001, idempotencyKey: randomUUID() }),
    ).toEqual({ ok: false, error: "AMOUNT_TOO_HIGH" });
    expect(await deposit({ ...base, amountCents: 0, idempotencyKey: randomUUID() })).toEqual({
      ok: false,
      error: "INVALID_AMOUNT",
    });
  });

  it("needs the user's account in that currency", async () => {
    expect(
      await deposit({
        userId: user.id,
        currency: "USD",
        amountCents: 100,
        idempotencyKey: randomUUID(),
      }),
    ).toEqual({ ok: false, error: "NO_ACCOUNT" });
  });
});

describe("readDepositConfirmation", () => {
  const KEY = "6f1c2b7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

  it("reads the currency, the amount and the key", () => {
    expect(readDepositConfirmation("USD", "1000000", KEY.toUpperCase())).toEqual({
      currency: "USD",
      amountCents: 1_000_000,
      idempotencyKey: KEY,
    });
  });

  it("rejects another currency, an amount out of range or a bad key", () => {
    expect(readDepositConfirmation("EUR", "100", KEY)).toBeNull();
    expect(readDepositConfirmation("USD", "1000001", KEY)).toBeNull();
    expect(readDepositConfirmation("ARS", "0", KEY)).toBeNull();
    expect(readDepositConfirmation("ARS", "100", "nope")).toBeNull();
    expect(readDepositConfirmation("ARS", ["100"], KEY)).toBeNull();
  });
});
