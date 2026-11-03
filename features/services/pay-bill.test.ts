import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adhereService } from "./adhesions";
import { findServicePaymentMovementByKey, payBill } from "./pay-bill";

const EMAILS = ["payer@services.test", "other@services.test"];
const NOW = new Date("2026-11-03T15:00:00Z");

type TestUser = {
  id: string;
  ars: string;
  arsCard: string;
  usdCard: string;
  bills: string[];
};

async function createUser(email: string, arsCents: number): Promise<TestUser> {
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
            balanceCents: 100_000_000,
            cards: { create: [card("2222")] },
          },
        ],
      },
    },
    include: { accounts: { include: { cards: true } } },
  });
  const adhered = await adhereService(
    user.id,
    { company: "EDESUR", paymentNumber: "0012345678", nickname: "Luz depto" },
    NOW,
  );
  if (!adhered.ok) throw new Error(adhered.error);
  const bills = await db.serviceBill.findMany({
    where: { adhesionId: adhered.adhesionId },
    orderBy: { dueDate: "asc" },
  });
  const ars = user.accounts.find((a) => a.currency === "ARS")!;
  const usd = user.accounts.find((a) => a.currency === "USD")!;
  return {
    id: user.id,
    ars: ars.id,
    arsCard: ars.cards[0].id,
    usdCard: usd.cards[0].id,
    bills: bills.map((bill) => bill.id),
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
    bills: await db.serviceBill.findMany({ where: { adhesion: where }, orderBy: { id: "asc" } }),
    payments: await db.servicePayment.findMany({ where, orderBy: { id: "asc" } }),
  };
}

let user: TestUser;
let other: TestUser;

function pay(overrides: Partial<Parameters<typeof payBill>[0]> = {}) {
  return payBill({
    userId: user.id,
    billId: user.bills[1],
    cardId: user.arsCard,
    idempotencyKey: randomUUID(),
    ...overrides,
  });
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  user = await createUser(EMAILS[0], 30_000_000);
  other = await createUser(EMAILS[1], 30_000_000);
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("adhereService", () => {
  it("creates the adhesion with its two simulated pending bills", async () => {
    const adhesion = await db.serviceAdhesion.findFirstOrThrow({
      where: { userId: user.id },
      include: { bills: { orderBy: { dueDate: "asc" } } },
    });
    expect(adhesion).toMatchObject({
      company: "EDESUR",
      paymentNumber: "0012345678",
      nickname: "Luz depto",
    });
    expect(adhesion.bills.map((bill) => [bill.period, bill.status, bill.paidAt])).toEqual([
      ["Octubre 2026", "PENDING", null],
      ["Noviembre 2026", "PENDING", null],
    ]);
  });

  it("rejects the same company and number twice for one user", async () => {
    expect(
      await adhereService(
        user.id,
        { company: "EDESUR", paymentNumber: "0012345678", nickname: "otra" },
        NOW,
      ),
    ).toEqual({ ok: false, error: "DUPLICATE" });
    expect(await db.serviceAdhesion.count({ where: { userId: user.id } })).toBe(1);
  });
});

describe("payBill", () => {
  it("pays a bill: debits the account, marks it paid and records one movement", async () => {
    const bill = await db.serviceBill.findUniqueOrThrow({ where: { id: user.bills[1] } });
    const result = await pay();
    if (!result.ok) throw new Error(result.error);

    expect(await balanceOf(user.ars)).toBe(BigInt(30_000_000) - bill.amountCents);
    const paid = await db.serviceBill.findUniqueOrThrow({ where: { id: bill.id } });
    expect(paid.status).toBe("PAID");
    const payment = await db.servicePayment.findUniqueOrThrow({ where: { id: result.paymentId } });
    expect(payment).toMatchObject({
      userId: user.id,
      billId: bill.id,
      accountId: user.ars,
      cardId: user.arsCard,
      amountCents: bill.amountCents,
    });
    expect(paid.paidAt).toEqual(payment.createdAt);
    const movements = await db.movement.findMany({ where: { servicePaymentId: payment.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      id: result.movementId,
      accountId: user.ars,
      cardId: user.arsCard,
      type: "SERVICE_PAYMENT",
      counterparty: "Pago Edesur · Luz depto",
      amountCents: bill.amountCents,
      reference: `SV-${String(payment.number).padStart(6, "0")}`,
      occurredAt: payment.createdAt,
    });
    // The other bill stays pending.
    expect((await db.serviceBill.findUniqueOrThrow({ where: { id: user.bills[0] } })).status).toBe(
      "PENDING",
    );
  });

  it("rejects a bill that is already paid and changes nothing", async () => {
    expect((await pay()).ok).toBe(true);
    const before = await snapshot();

    expect(await pay()).toEqual({ ok: false, error: "ALREADY_PAID" });
    expect(await snapshot()).toEqual(before);
  });

  it.each([
    ["another user's bill", { billId: "other" }, "BILL_NOT_FOUND"],
    ["an unknown bill", { billId: randomUUID() }, "BILL_NOT_FOUND"],
    ["another user's card", { cardId: "other" }, "CARD_NOT_FOUND"],
    ["an unknown card", { cardId: randomUUID() }, "CARD_NOT_FOUND"],
    ["a dollar card for a peso bill", { cardId: "usd" }, "CURRENCY_MISMATCH"],
  ])("rejects %s and changes nothing", async (_name, overrides, error) => {
    const resolved: Partial<Parameters<typeof payBill>[0]> = { ...overrides };
    if (resolved.billId === "other") resolved.billId = other.bills[1];
    if (resolved.cardId === "other") resolved.cardId = other.arsCard;
    if (resolved.cardId === "usd") resolved.cardId = user.usdCard;
    const before = await snapshot();

    expect(await pay(resolved)).toEqual({ ok: false, error });
    expect(await snapshot()).toEqual(before);
  });

  it("rejects a bill above the balance and changes nothing", async () => {
    const bill = await db.serviceBill.findUniqueOrThrow({ where: { id: user.bills[1] } });
    await db.account.update({
      where: { id: user.ars },
      data: { balanceCents: bill.amountCents - BigInt(1) },
    });
    const before = await snapshot();

    expect(await pay()).toEqual({ ok: false, error: "INSUFFICIENT_FUNDS" });
    expect(await snapshot()).toEqual(before);
  });

  it("allows paying with the whole balance", async () => {
    const bill = await db.serviceBill.findUniqueOrThrow({ where: { id: user.bills[1] } });
    await db.account.update({ where: { id: user.ars }, data: { balanceCents: bill.amountCents } });

    expect((await pay()).ok).toBe(true);
    expect(await balanceOf(user.ars)).toBe(BigInt(0));
  });

  it("returns the first result when the same key is replayed", async () => {
    const idempotencyKey = randomUUID();
    const first = await pay({ idempotencyKey });
    const second = await pay({ idempotencyKey });

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(await db.servicePayment.count({ where: { userId: user.id } })).toBe(1);
    expect(await db.movement.count({ where: { accountId: user.ars } })).toBe(1);
  });

  it.each([
    ["another bill", { billId: 0 }],
    ["another card", { cardId: "second" }],
  ])("rejects the same key with %s and changes nothing", async (_name, overrides) => {
    const idempotencyKey = randomUUID();
    expect((await pay({ idempotencyKey })).ok).toBe(true);
    const resolved: Partial<Parameters<typeof payBill>[0]> = { idempotencyKey };
    if ("billId" in overrides) resolved.billId = user.bills[overrides.billId];
    if ("cardId" in overrides) {
      resolved.cardId = (
        await db.card.create({
          data: { accountId: user.ars, brand: "AMEX", last4: "9999", holder: "Test", expiry: "01/31" },
        })
      ).id;
    }
    const before = await snapshot();

    expect(await pay(resolved)).toEqual({ ok: false, error: "IDEMPOTENCY_MISMATCH" });
    expect(await snapshot()).toEqual(before);
  });

  it("pays a bill once when 10 payments of it arrive at once", async () => {
    const bill = await db.serviceBill.findUniqueOrThrow({ where: { id: user.bills[1] } });
    const shared = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => pay({ idempotencyKey: i < 3 ? shared : randomUUID() })),
    );

    const succeeded = results.filter((result) => result.ok);
    // The three requests with the shared key may all report the one payment.
    expect(new Set(succeeded.map((result) => result.ok && result.paymentId)).size).toBe(1);
    for (const result of results) {
      if (!result.ok) expect(result.error).toBe("ALREADY_PAID");
    }
    expect(await db.servicePayment.count({ where: { billId: bill.id } })).toBe(1);
    expect(await db.movement.count({ where: { accountId: user.ars } })).toBe(1);
    expect(await balanceOf(user.ars)).toBe(BigInt(30_000_000) - bill.amountCents);
  });

  it("never overdraws when two bills drain the balance at once", async () => {
    const bills = await db.serviceBill.findMany({ where: { id: { in: user.bills } } });
    const smaller = bills.reduce((a, b) => (a.amountCents < b.amountCents ? a : b));
    await db.account.update({ where: { id: user.ars }, data: { balanceCents: smaller.amountCents } });

    const results = await Promise.all(user.bills.map((billId) => pay({ billId })));

    expect(results.filter((result) => result.ok).length).toBeLessThanOrEqual(1);
    expect((await balanceOf(user.ars)) >= BigInt(0)).toBe(true);
  });
});

describe("findServicePaymentMovementByKey", () => {
  it("finds the movement of a used key, only for its owner", async () => {
    const idempotencyKey = randomUUID();
    const result = await pay({ idempotencyKey });
    if (!result.ok) throw new Error(result.error);

    expect(await findServicePaymentMovementByKey(user.id, idempotencyKey)).toBe(result.movementId);
    expect(await findServicePaymentMovementByKey(other.id, idempotencyKey)).toBeNull();
    expect(await findServicePaymentMovementByKey(user.id, randomUUID())).toBeNull();
  });
});
