import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { exchange, findExchangeMovementByKey, type ExchangeRequest } from "./exchange";
import { MAX_EXCHANGE_USD_CENTS } from "./rate";

const EMAILS = ["buyer@exchange.test", "other@exchange.test"];

type TestUser = { id: string; ars: string; usd: string; arsCard: string; usdCard: string };

async function createUser(email: string, arsCents: number, usdCents: number): Promise<TestUser> {
  const alias = email.replace("@", ".");
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
            balanceCents: usdCents,
            cards: { create: [card("2222")] },
          },
        ],
      },
    },
    include: { accounts: { include: { cards: true } } },
  });
  const ars = user.accounts.find((a) => a.currency === "ARS")!;
  const usd = user.accounts.find((a) => a.currency === "USD")!;
  return { id: user.id, ars: ars.id, usd: usd.id, arsCard: ars.cards[0].id, usdCard: usd.cards[0].id };
}

async function balanceOf(accountId: string) {
  return (await db.account.findUniqueOrThrow({ where: { id: accountId } })).balanceCents;
}

async function snapshot() {
  const where = { user: { email: { in: EMAILS } } };
  return {
    accounts: await db.account.findMany({ where, orderBy: { id: "asc" } }),
    movements: await db.movement.findMany({ where: { account: where }, orderBy: { id: "asc" } }),
    exchanges: await db.exchange.findMany({ where, orderBy: { id: "asc" } }),
  };
}

let user: TestUser;
let other: TestUser;
/** Shared by the mismatch cases; users are recreated before each test. */
const key = randomUUID();

function buy(usdCents: number, overrides: Partial<ExchangeRequest> = {}) {
  return exchange({
    userId: user.id,
    direction: "BUY",
    usdCents,
    fromCardId: user.arsCard,
    toCardId: user.usdCard,
    idempotencyKey: randomUUID(),
    ...overrides,
  });
}

function sell(usdCents: number, overrides: Partial<ExchangeRequest> = {}) {
  return exchange({
    userId: user.id,
    direction: "SELL",
    usdCents,
    fromCardId: user.usdCard,
    toCardId: user.arsCard,
    idempotencyKey: randomUUID(),
    ...overrides,
  });
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  // 4.500 pesos and 5 dollars.
  user = await createUser(EMAILS[0], 450000, 500);
  other = await createUser(EMAILS[1], 450000, 500);
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("exchange", () => {
  it("buys dollars: debits pesos at 1500 and credits dollars", async () => {
    const result = await buy(100);

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(await balanceOf(user.ars)).toBe(BigInt(300000));
    expect(await balanceOf(user.usd)).toBe(BigInt(600));

    const record = await db.exchange.findUniqueOrThrow({
      where: { id: result.exchangeId },
      include: { movements: true },
    });
    expect(record).toMatchObject({
      userId: user.id,
      direction: "BUY",
      usdCents: BigInt(100),
      arsCents: BigInt(150000),
      rateArsPerUsd: 1500,
      fromAccountId: user.ars,
      toAccountId: user.usd,
    });
    const reference = `CX-${String(record.number).padStart(6, "0")}`;
    expect(reference).toMatch(/^CX-\d{6,}$/);
    const byAccount = Object.fromEntries(record.movements.map((m) => [m.accountId, m]));
    expect(byAccount[user.ars]).toMatchObject({
      type: "EXCHANGE",
      counterparty: "Compra de dólares",
      amountCents: BigInt(150000),
      reference,
      exchangeId: record.id,
    });
    expect(byAccount[user.usd]).toMatchObject({
      type: "EXCHANGE",
      counterparty: "Compra de dólares",
      amountCents: BigInt(100),
      reference,
      exchangeId: record.id,
    });
    expect(record.movements).toHaveLength(2);
    // The movement returned is the side the money left.
    expect(result.movementId).toBe(byAccount[user.ars].id);
  });

  it("sells dollars: debits dollars and credits pesos at 1500", async () => {
    const result = await sell(200);

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(await balanceOf(user.usd)).toBe(BigInt(300));
    expect(await balanceOf(user.ars)).toBe(BigInt(750000));

    const movements = await db.movement.findMany({ where: { exchangeId: result.exchangeId } });
    const byAccount = Object.fromEntries(movements.map((m) => [m.accountId, m]));
    expect(byAccount[user.usd]).toMatchObject({
      type: "EXCHANGE",
      counterparty: "Venta de dólares",
      amountCents: BigInt(200),
    });
    expect(byAccount[user.ars]).toMatchObject({
      type: "EXCHANGE",
      counterparty: "Venta de dólares",
      amountCents: BigInt(300000),
    });
    expect(byAccount[user.ars].reference).toBe(byAccount[user.usd].reference);
    expect(result.movementId).toBe(byAccount[user.usd].id);
    expect(await db.exchange.findUniqueOrThrow({ where: { id: result.exchangeId } })).toMatchObject({
      direction: "SELL",
      fromAccountId: user.usd,
      toAccountId: user.ars,
    });
  });

  it("credits a sale of dollars to a peso balance above 2^31 cents", async () => {
    // $30.000.000 is past the old 32-bit limit of $21.474.836,47.
    await db.user.deleteMany({ where: { email: EMAILS[0] } });
    user = await createUser(EMAILS[0], 3_000_000_000, 1_000_000);

    const result = await sell(1_000_000);

    expect(result).toMatchObject({ ok: true });
    expect(await balanceOf(user.usd)).toBe(BigInt(0));
    expect(await balanceOf(user.ars)).toBe(BigInt(4_500_000_000));
    if (!result.ok) return;
    const movements = await db.movement.findMany({ where: { exchangeId: result.exchangeId } });
    const credit = movements.find((m) => m.accountId === user.ars);
    expect(credit?.amountCents).toBe(BigInt(1_500_000_000));
  });

  it("gives each exchange its own reference", async () => {
    const first = await buy(1);
    const second = await buy(1);
    const references = await db.movement.findMany({
      where: { accountId: user.ars },
      select: { reference: true },
    });
    expect(first.ok && second.ok).toBe(true);
    expect(new Set(references.map((r) => r.reference)).size).toBe(2);
  });

  it.each([
    ["another user's peso card", () => ({ fromCardId: other.arsCard })],
    ["another user's dollar card", () => ({ toCardId: other.usdCard })],
    ["a card that does not exist", () => ({ toCardId: randomUUID() })],
  ])("rejects %s and changes nothing", async (_name, overrides) => {
    const before = await snapshot();
    expect(await buy(100, overrides())).toEqual({ ok: false, error: "CARD_NOT_FOUND" });
    expect(await snapshot()).toEqual(before);
  });

  it.each([
    ["buying with a dollar card", "BUY", () => ({ fromCardId: user.usdCard, toCardId: user.usdCard })],
    ["buying into a peso card", "BUY", () => ({ fromCardId: user.arsCard, toCardId: user.arsCard })],
    ["selling from a peso card", "SELL", () => ({ fromCardId: user.arsCard, toCardId: user.usdCard })],
  ] as const)("rejects %s as a currency mismatch", async (_name, direction, overrides) => {
    const before = await snapshot();
    const request = direction === "BUY" ? buy : sell;
    expect(await request(100, overrides())).toEqual({ ok: false, error: "CURRENCY_MISMATCH" });
    expect(await snapshot()).toEqual(before);
  });

  it.each([0, -100, 1.5, Number.NaN, MAX_EXCHANGE_USD_CENTS + 1])(
    "rejects the amount %d",
    async (usdCents) => {
      const before = await snapshot();
      expect(await buy(usdCents)).toEqual({ ok: false, error: "INVALID_AMOUNT" });
      expect(await snapshot()).toEqual(before);
    },
  );

  it.each([
    ["buying more dollars than the pesos cover", () => buy(301)],
    ["selling more dollars than the account holds", () => sell(501)],
  ])("rejects %s and changes nothing", async (_name, run) => {
    const before = await snapshot();
    expect(await run()).toEqual({ ok: false, error: "INSUFFICIENT_FUNDS" });
    expect(await snapshot()).toEqual(before);
  });

  it("spends the whole balance when it covers the amount exactly", async () => {
    expect((await buy(300)).ok).toBe(true);
    expect(await balanceOf(user.ars)).toBe(BigInt(0));
  });
});

describe("exchange idempotency", () => {
  it("returns the first result for a repeated request and exchanges once", async () => {
    const idempotencyKey = randomUUID();
    const first = await buy(100, { idempotencyKey });
    const second = await buy(100, { idempotencyKey });

    expect(second).toEqual(first);
    expect(await balanceOf(user.ars)).toBe(BigInt(300000));
    expect(await db.exchange.count({ where: { userId: user.id } })).toBe(1);
  });

  it("exchanges once when the same request arrives twice at the same time", async () => {
    const idempotencyKey = randomUUID();
    const [first, second] = await Promise.all([
      buy(100, { idempotencyKey }),
      buy(100, { idempotencyKey }),
    ]);

    expect(second).toEqual(first);
    expect(await balanceOf(user.usd)).toBe(BigInt(600));
    expect(await db.exchange.count({ where: { userId: user.id } })).toBe(1);
  });

  it.each([
    ["another amount", () => buy(200, { idempotencyKey: key })],
    ["the other direction", () => sell(100, { idempotencyKey: key })],
  ])("rejects the same key with %s and changes nothing", async (_name, run) => {
    await buy(100, { idempotencyKey: key });
    const before = await snapshot();

    expect(await run()).toEqual({ ok: false, error: "IDEMPOTENCY_MISMATCH" });
    expect(await snapshot()).toEqual(before);
  });

  it("lets two users use the same key", async () => {
    const idempotencyKey = randomUUID();
    const mine = await buy(100, { idempotencyKey });
    const theirs = await exchange({
      userId: other.id,
      direction: "BUY",
      usdCents: 100,
      fromCardId: other.arsCard,
      toCardId: other.usdCard,
      idempotencyKey,
    });
    expect(mine.ok && theirs.ok).toBe(true);
  });
});

describe("exchange concurrency", () => {
  it("never takes the pesos below zero under concurrent buys", async () => {
    // Each buy costs 1.500 pesos; the account holds 4.500.
    const results = await Promise.all(Array.from({ length: 5 }, () => buy(100)));

    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(results.filter((r) => !r.ok)).toEqual([
      { ok: false, error: "INSUFFICIENT_FUNDS" },
      { ok: false, error: "INSUFFICIENT_FUNDS" },
    ]);
    expect(await balanceOf(user.ars)).toBe(BigInt(0));
    expect(await balanceOf(user.usd)).toBe(BigInt(800));
  });

  it("does not deadlock when buys and sells on the same accounts run at once", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => (i % 2 === 0 ? buy(100) : sell(100))),
    );

    expect(results.every((r) => r.ok)).toBe(true);
    expect(await balanceOf(user.ars)).toBe(BigInt(450000));
    expect(await balanceOf(user.usd)).toBe(BigInt(500));
  });
});

describe("findExchangeMovementByKey", () => {
  it("finds the movement of a used key, only for its owner", async () => {
    const idempotencyKey = randomUUID();
    const result = await buy(100, { idempotencyKey });

    expect(await findExchangeMovementByKey(user.id, idempotencyKey)).toBe(
      result.ok ? result.movementId : "",
    );
    expect(await findExchangeMovementByKey(other.id, idempotencyKey)).toBeNull();
    expect(await findExchangeMovementByKey(user.id, randomUUID())).toBeNull();
  });
});

describe("exchange cards", () => {
  it("records the picked card on each side's movement", async () => {
    // A second peso card, so the test proves the picked one is used.
    const picked = await db.card.create({
      data: { accountId: user.ars, brand: "AMEX", last4: "8845", holder: "Test Holder", expiry: "12/30" },
    });

    const bought = await buy(100, { fromCardId: picked.id });
    if (!bought.ok) throw new Error(bought.error);
    const boughtMovements = await db.movement.findMany({ where: { exchangeId: bought.exchangeId } });
    expect(Object.fromEntries(boughtMovements.map((m) => [m.accountId, m.cardId]))).toEqual({
      [user.ars]: picked.id,
      [user.usd]: user.usdCard,
    });

    const sold = await sell(100, { toCardId: picked.id });
    if (!sold.ok) throw new Error(sold.error);
    const soldMovements = await db.movement.findMany({ where: { exchangeId: sold.exchangeId } });
    expect(Object.fromEntries(soldMovements.map((m) => [m.accountId, m.cardId]))).toEqual({
      [user.usd]: user.usdCard,
      [user.ars]: picked.id,
    });
  });
});
