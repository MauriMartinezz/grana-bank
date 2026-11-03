import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { findTopUpMovementByKey, topUp, type TopUpRequest } from "./top-up";

const EMAILS = ["payer@top-up.test", "other@top-up.test"];
const SUBE_NUMBER = "6061234567890123";

type TestUser = { id: string; ars: string; arsCard: string; usdCard: string; sube: string };

async function createUser(email: string, arsCents: number): Promise<TestUser> {
  const alias = email.replace("@", ".").replace("-", "");
  const card = (last4: string) => ({
    brand: "VISA" as const,
    last4,
    holder: "Test Holder",
    expiry: "12/30",
  });
  const user = await db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: [
          { currency: "ARS", alias, balanceCents: arsCents, cards: { create: [card("1111")] } },
          {
            currency: "USD",
            alias: `${alias}.usd`,
            balanceCents: 1_000_000,
            cards: { create: [card("2222")] },
          },
        ],
      },
      subeCards: { create: { number: SUBE_NUMBER, nickname: "sube de mauri" } },
    },
    include: { accounts: { include: { cards: true } }, subeCards: true },
  });
  const ars = user.accounts.find((a) => a.currency === "ARS")!;
  const usd = user.accounts.find((a) => a.currency === "USD")!;
  return {
    id: user.id,
    ars: ars.id,
    arsCard: ars.cards[0].id,
    usdCard: usd.cards[0].id,
    sube: user.subeCards[0].id,
  };
}

async function balanceOf(accountId: string) {
  return (await db.account.findUniqueOrThrow({ where: { id: accountId } })).balanceCents;
}

async function snapshot() {
  const where = { user: { email: { in: EMAILS } } };
  return {
    accounts: await db.account.findMany({ where, orderBy: { id: "asc" } }),
    movements: await db.movement.findMany({ where: { account: where }, orderBy: { id: "asc" } }),
    topUps: await db.topUp.findMany({ where, orderBy: { id: "asc" } }),
  };
}

let user: TestUser;
let other: TestUser;

function sube(amountCents: number, overrides: Partial<TopUpRequest> = {}) {
  return topUp({
    userId: user.id,
    kind: "SUBE",
    provider: "SUBE",
    target: user.sube,
    amountCents,
    cardId: user.arsCard,
    idempotencyKey: randomUUID(),
    ...overrides,
  });
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  user = await createUser(EMAILS[0], 3_000_000);
  other = await createUser(EMAILS[1], 3_000_000);
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("topUp", () => {
  it("tops up a SUBE card: debits the peso account and records one movement", async () => {
    const result = await sube(150050);
    if (!result.ok) throw new Error(result.error);

    expect(await balanceOf(user.ars)).toBe(BigInt(3_000_000 - 150050));
    const created = await db.topUp.findUniqueOrThrow({ where: { id: result.topUpId } });
    expect(created).toMatchObject({
      userId: user.id,
      kind: "SUBE",
      provider: "SUBE",
      target: user.sube,
      amountCents: BigInt(150050),
      accountId: user.ars,
      cardId: user.arsCard,
    });
    const movements = await db.movement.findMany({ where: { topUpId: result.topUpId } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      id: result.movementId,
      accountId: user.ars,
      cardId: user.arsCard,
      type: "TOP_UP",
      counterparty: "Recarga SUBE · sube de mauri ···· 0123",
      amountCents: BigInt(150050),
      reference: `RC-${String(created.number).padStart(6, "0")}`,
      occurredAt: created.createdAt,
    });
  });

  it("tops up a phone line, stored as its national number", async () => {
    const result = await sube(200000, {
      kind: "PHONE",
      provider: "PERSONAL",
      target: "+54 9 11 1234-5678",
    });
    if (!result.ok) throw new Error(result.error);

    const created = await db.topUp.findUniqueOrThrow({
      where: { id: result.topUpId },
      include: { movements: true },
    });
    expect(created).toMatchObject({ kind: "PHONE", provider: "PERSONAL", target: "1112345678" });
    expect(created.movements[0].counterparty).toBe("Recarga Personal · +54 11 1234 5678");
    expect(await balanceOf(user.ars)).toBe(BigInt(2_800_000));
  });

  it("tops up a DirecTV account and masks it in the movement", async () => {
    const result = await sube(1_000_000, {
      kind: "DIRECTV",
      provider: "DIRECTV",
      target: "8765-4321",
    });
    if (!result.ok) throw new Error(result.error);

    const created = await db.topUp.findUniqueOrThrow({
      where: { id: result.topUpId },
      include: { movements: true },
    });
    expect(created).toMatchObject({ kind: "DIRECTV", provider: "DIRECTV", target: "87654321" });
    expect(created.movements[0].counterparty).toBe("Recarga DirecTV · ···· 4321");
  });

  it.each([
    ["an amount below $100", { amountCents: 9999 }, "INVALID_AMOUNT"],
    ["an amount above $50.000", { amountCents: 5_000_001 }, "INVALID_AMOUNT"],
    ["a fractional amount", { amountCents: 10000.5 }, "INVALID_AMOUNT"],
    ["another user's SUBE card", { target: "other" }, "SUBE_CARD_NOT_FOUND"],
    ["an unknown SUBE card", { target: randomUUID() }, "SUBE_CARD_NOT_FOUND"],
    ["another user's card", { cardId: "other" }, "CARD_NOT_FOUND"],
    ["an unknown card", { cardId: randomUUID() }, "CARD_NOT_FOUND"],
    ["a dollar card", { cardId: "usd" }, "CURRENCY_MISMATCH"],
    ["a phone company for SUBE", { provider: "CLARO" as const }, "INVALID_TARGET"],
    [
      "an invalid phone number",
      { kind: "PHONE" as const, provider: "CLARO" as const, target: "1234" },
      "INVALID_TARGET",
    ],
    [
      "SUBE as a phone company",
      { kind: "PHONE" as const, provider: "SUBE" as const, target: "1112345678" },
      "INVALID_TARGET",
    ],
    [
      "a short DirecTV account",
      { kind: "DIRECTV" as const, provider: "DIRECTV" as const, target: "1234567" },
      "INVALID_TARGET",
    ],
  ])("rejects %s and changes nothing", async (_name, overrides, error) => {
    const resolved: Partial<TopUpRequest> = { ...overrides };
    if (resolved.target === "other") resolved.target = other.sube;
    if (resolved.cardId === "other") resolved.cardId = other.arsCard;
    if (resolved.cardId === "usd") resolved.cardId = user.usdCard;
    const before = await snapshot();

    expect(await sube(10000, resolved)).toEqual({ ok: false, error });
    expect(await snapshot()).toEqual(before);
  });

  it("rejects a top-up above the balance and changes nothing", async () => {
    await db.account.update({ where: { id: user.ars }, data: { balanceCents: 9_999 + 10_000 } });
    const before = await snapshot();

    expect(await sube(20_000)).toEqual({ ok: false, error: "INSUFFICIENT_FUNDS" });
    expect(await snapshot()).toEqual(before);
  });

  it("allows a top-up of the whole balance", async () => {
    await db.account.update({ where: { id: user.ars }, data: { balanceCents: 10_000 } });

    expect((await sube(10_000)).ok).toBe(true);
    expect(await balanceOf(user.ars)).toBe(BigInt(0));
  });

  it("returns the first result when the same key is replayed", async () => {
    const idempotencyKey = randomUUID();
    const first = await sube(10_000, { idempotencyKey });
    const second = await sube(10_000, { idempotencyKey });

    expect(second).toEqual(first);
    expect(await balanceOf(user.ars)).toBe(BigInt(2_990_000));
    expect(await db.topUp.count({ where: { userId: user.id } })).toBe(1);
  });

  it("charges once when the same key arrives twice at once", async () => {
    const idempotencyKey = randomUUID();
    const [first, second] = await Promise.all([
      sube(10_000, { idempotencyKey }),
      sube(10_000, { idempotencyKey }),
    ]);

    expect(second).toEqual(first);
    expect(await balanceOf(user.ars)).toBe(BigInt(2_990_000));
  });

  it("treats a phone number typed another way as the same top-up", async () => {
    const idempotencyKey = randomUUID();
    const phone = { kind: "PHONE" as const, provider: "MOVISTAR" as const, idempotencyKey };
    const first = await sube(10_000, { ...phone, target: "11 1234 5678" });
    const second = await sube(10_000, { ...phone, target: "+5491112345678" });

    expect(second).toEqual(first);
  });

  it.each([
    ["another amount", { amountCents: 20_000 }],
    ["another SUBE card", { target: "second" }],
    ["another kind", { kind: "DIRECTV" as const, provider: "DIRECTV" as const, target: "12345678" }],
  ])("rejects the same key with %s and changes nothing", async (_name, overrides) => {
    const idempotencyKey = randomUUID();
    await sube(10_000, { idempotencyKey });
    const resolved: Partial<TopUpRequest> = { ...overrides, idempotencyKey };
    if (resolved.target === "second") {
      resolved.target = (
        await db.subeCard.create({
          data: { userId: user.id, number: "6061000000000000", nickname: "otra" },
        })
      ).id;
    }
    const before = await snapshot();

    expect(await sube(10_000, resolved)).toEqual({ ok: false, error: "IDEMPOTENCY_MISMATCH" });
    expect(await snapshot()).toEqual(before);
  });

  it("keys are per user: another user's key does not clash", async () => {
    const idempotencyKey = randomUUID();
    await sube(10_000, { idempotencyKey });

    const theirs = await topUp({
      userId: other.id,
      kind: "SUBE",
      provider: "SUBE",
      target: other.sube,
      amountCents: 10_000,
      cardId: other.arsCard,
      idempotencyKey,
    });
    expect(theirs.ok).toBe(true);
  });

  it("never overdraws when 20 top-ups drain the balance at once", async () => {
    await db.account.update({ where: { id: user.ars }, data: { balanceCents: 150_000 } });

    const results = await Promise.all(Array.from({ length: 20 }, () => sube(10_000)));

    expect(results.filter((r) => r.ok)).toHaveLength(15);
    expect(results.filter((r) => !r.ok)).toEqual(
      Array.from({ length: 5 }, () => ({ ok: false, error: "INSUFFICIENT_FUNDS" })),
    );
    expect(await balanceOf(user.ars)).toBe(BigInt(0));
    expect(await db.movement.count({ where: { accountId: user.ars, type: "TOP_UP" } })).toBe(15);
  });
});

describe("findTopUpMovementByKey", () => {
  it("finds the movement of a used key, only for its owner", async () => {
    const idempotencyKey = randomUUID();
    const result = await sube(10_000, { idempotencyKey });
    if (!result.ok) throw new Error(result.error);

    expect(await findTopUpMovementByKey(user.id, idempotencyKey)).toBe(result.movementId);
    expect(await findTopUpMovementByKey(other.id, idempotencyKey)).toBeNull();
    expect(await findTopUpMovementByKey(user.id, randomUUID())).toBeNull();
  });
});
