import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { adhereService } from "./adhesions";
import { payBill } from "./pay-bill";
import { processScheduledPayments } from "./scheduled-payments";

const EMAILS = ["scheduler@scheduled.test", "neighbor@scheduled.test"];
const NOW = new Date("2026-11-10T15:00:00Z");
const TODAY = new Date("2026-11-10T00:00:00Z");
const TOMORROW = new Date("2026-11-11T00:00:00Z");
const YESTERDAY = new Date("2026-11-09T00:00:00Z");
const BILL_CENTS = BigInt(1_000_000);

type TestUser = { id: string; ars: string; arsCard: string; otherArsCard: string; bill: string };

async function createUser(email: string, arsCents: bigint): Promise<TestUser> {
  const alias = email.split("@")[0];
  const card = (last4: string) => ({ brand: "VISA" as const, last4, holder: "Test", expiry: "12/30" });
  const user = await db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: [
          {
            currency: "ARS",
            alias,
            balanceCents: arsCents,
            cards: { create: [card("1111"), card("3333")] },
          },
        ],
      },
    },
    include: { accounts: { include: { cards: { orderBy: { last4: "asc" } } } } },
  });
  const adhered = await adhereService(
    user.id,
    { company: "EDESUR", paymentNumber: "0012345678", nickname: "Luz depto" },
    NOW,
  );
  if (!adhered.ok) throw new Error(adhered.error);
  // One pending bill with a known amount, due tomorrow unless a test moves it.
  const bills = await db.serviceBill.findMany({
    where: { adhesionId: adhered.adhesionId },
    orderBy: { dueDate: "asc" },
  });
  await db.serviceBill.delete({ where: { id: bills[0].id } });
  await db.serviceBill.update({
    where: { id: bills[1].id },
    data: { amountCents: BILL_CENTS, dueDate: TOMORROW },
  });
  const ars = user.accounts[0];
  return {
    id: user.id,
    ars: ars.id,
    arsCard: ars.cards[0].id,
    otherArsCard: ars.cards[1].id,
    bill: bills[1].id,
  };
}

async function balanceOf(accountId: string) {
  return (await db.account.findUniqueOrThrow({ where: { id: accountId } })).balanceCents;
}

async function billOf(id: string) {
  return db.serviceBill.findUniqueOrThrow({ where: { id } });
}

async function movementsOf(accountId: string) {
  return db.movement.findMany({ where: { accountId } });
}

function schedule(billId: string, cardId: string | null, date: Date) {
  return db.serviceBill.update({
    where: { id: billId },
    data: { scheduledFor: date, scheduledCardId: cardId },
  });
}

function autoDebit(user: TestUser, cardId: string) {
  return db.serviceAdhesion.updateMany({
    where: { userId: user.id },
    data: { autoDebitCardId: cardId },
  });
}

let payer: TestUser;
let neighbor: TestUser;

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  payer = await createUser(EMAILS[0], BigInt(5_000_000));
  neighbor = await createUser(EMAILS[1], BigInt(5_000_000));
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("processScheduledPayments", () => {
  it("pays a one-off schedule whose date arrived with its card", async () => {
    await schedule(payer.bill, payer.otherArsCard, TODAY);

    const summary = await processScheduledPayments({ now: NOW, userId: payer.id });

    expect(summary).toEqual({ paid: 1, failed: 0 });
    expect(await balanceOf(payer.ars)).toBe(BigInt(4_000_000));
    const bill = await billOf(payer.bill);
    expect(bill.status).toBe("PAID");
    expect(bill.failedAt).toBeNull();
    const movements = await movementsOf(payer.ars);
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      type: "SERVICE_PAYMENT",
      cardId: payer.otherArsCard,
      amountCents: BILL_CENTS,
    });
  });

  it("leaves a schedule for a later date untouched", async () => {
    await schedule(payer.bill, payer.arsCard, TOMORROW);

    const summary = await processScheduledPayments({ now: NOW, userId: payer.id });

    expect(summary).toEqual({ paid: 0, failed: 0 });
    expect((await billOf(payer.bill)).status).toBe("PENDING");
    expect(await balanceOf(payer.ars)).toBe(BigInt(5_000_000));
  });

  it("debits an automatic payment on the due date and after it, not before", async () => {
    await autoDebit(payer, payer.arsCard);

    expect(await processScheduledPayments({ now: NOW, userId: payer.id })).toEqual({
      paid: 0,
      failed: 0,
    });
    expect((await billOf(payer.bill)).status).toBe("PENDING");

    await db.serviceBill.update({ where: { id: payer.bill }, data: { dueDate: YESTERDAY } });
    expect(await processScheduledPayments({ now: NOW, userId: payer.id })).toEqual({
      paid: 1,
      failed: 0,
    });
    expect((await billOf(payer.bill)).status).toBe("PAID");
    expect(await balanceOf(payer.ars)).toBe(BigInt(4_000_000));
  });

  it("lets a one-off schedule win over the automatic debit", async () => {
    await autoDebit(payer, payer.arsCard);
    await db.serviceBill.update({ where: { id: payer.bill }, data: { dueDate: TODAY } });
    await schedule(payer.bill, payer.otherArsCard, TOMORROW);

    expect(await processScheduledPayments({ now: NOW, userId: payer.id })).toEqual({
      paid: 0,
      failed: 0,
    });
    expect((await billOf(payer.bill)).status).toBe("PENDING");
  });

  it("ends without balance as failed, never overdraws and never retries", async () => {
    await db.account.update({ where: { id: payer.ars }, data: { balanceCents: BigInt(999_999) } });
    await schedule(payer.bill, payer.arsCard, TODAY);

    expect(await processScheduledPayments({ now: NOW, userId: payer.id })).toEqual({
      paid: 0,
      failed: 1,
    });
    const bill = await billOf(payer.bill);
    expect(bill.status).toBe("PENDING");
    expect(bill.failureReason).toBe("INSUFFICIENT_FUNDS");
    expect(bill.failedAt).toEqual(NOW);
    expect(await balanceOf(payer.ars)).toBe(BigInt(999_999));
    expect(await movementsOf(payer.ars)).toHaveLength(0);

    // With balance again, a failed payment waits for the user.
    await db.account.update({ where: { id: payer.ars }, data: { balanceCents: BigInt(5_000_000) } });
    expect(await processScheduledPayments({ now: NOW, userId: payer.id })).toEqual({
      paid: 0,
      failed: 0,
    });
    expect((await billOf(payer.bill)).status).toBe("PENDING");
  });

  it("fails a schedule whose card was removed", async () => {
    await schedule(payer.bill, payer.otherArsCard, TODAY);
    await db.card.delete({ where: { id: payer.otherArsCard } });

    expect(await processScheduledPayments({ now: NOW, userId: payer.id })).toEqual({
      paid: 0,
      failed: 1,
    });
    const bill = await billOf(payer.bill);
    expect(bill.failureReason).toBe("CARD_UNAVAILABLE");
    expect(await balanceOf(payer.ars)).toBe(BigInt(5_000_000));
  });

  it("processes only the given user's bills, or everyone's without one", async () => {
    await schedule(payer.bill, payer.arsCard, TODAY);
    await schedule(neighbor.bill, neighbor.arsCard, TODAY);

    expect(await processScheduledPayments({ now: NOW, userId: payer.id })).toEqual({
      paid: 1,
      failed: 0,
    });
    expect((await billOf(neighbor.bill)).status).toBe("PENDING");

    const all = await processScheduledPayments({ now: NOW });
    expect(all.paid).toBeGreaterThanOrEqual(1);
    expect((await billOf(neighbor.bill)).status).toBe("PAID");
    expect(await balanceOf(neighbor.ars)).toBe(BigInt(4_000_000));
  });

  it("pays a bill once when runs overlap", async () => {
    await schedule(payer.bill, payer.arsCard, TODAY);

    const runs = await Promise.all(
      Array.from({ length: 5 }, () => processScheduledPayments({ now: NOW, userId: payer.id })),
    );

    expect(runs.reduce((sum, run) => sum + run.failed, 0)).toBe(0);
    expect(await balanceOf(payer.ars)).toBe(BigInt(4_000_000));
    expect(await movementsOf(payer.ars)).toHaveLength(1);
    expect(await db.servicePayment.count({ where: { billId: payer.bill } })).toBe(1);
  });

  it("does not pay a schedule cancelled before the payment locks the bill", async () => {
    await schedule(payer.bill, payer.arsCard, TODAY);
    await db.serviceBill.update({
      where: { id: payer.bill },
      data: { scheduledFor: null, scheduledCardId: null },
    });

    const result = await payBill({
      userId: payer.id,
      billId: payer.bill,
      cardId: payer.arsCard,
      idempotencyKey: `scheduled-${payer.bill}`,
      scheduledOn: TODAY,
    });

    expect(result).toEqual({ ok: false, error: "NOT_SCHEDULED" });
    expect(await balanceOf(payer.ars)).toBe(BigInt(5_000_000));
  });
});

describe("paying a failed bill by hand", () => {
  it("pays it and clears the failure", async () => {
    await db.serviceBill.update({
      where: { id: payer.bill },
      data: { failedAt: NOW, failureReason: "INSUFFICIENT_FUNDS" },
    });

    const result = await payBill({
      userId: payer.id,
      billId: payer.bill,
      cardId: payer.arsCard,
      idempotencyKey: randomUUID(),
    });

    expect(result.ok).toBe(true);
    const bill = await billOf(payer.bill);
    expect(bill.status).toBe("PAID");
    expect(bill.failedAt).toBeNull();
    expect(bill.failureReason).toBeNull();
  });
});

describe("a failure racing a change", () => {
  it("does not mark failed a bill rescheduled while the run was paying it", async () => {
    await db.account.update({ where: { id: payer.ars }, data: { balanceCents: BigInt(0) } });
    await schedule(payer.bill, payer.arsCard, TODAY);
    // The user reschedules after the run read the bill and before it marks it.
    const original = db.serviceBill.updateMany.bind(db.serviceBill);
    const reschedulingFirst = async (args: Parameters<typeof original>[0]) => {
      await schedule(payer.bill, payer.otherArsCard, TOMORROW);
      return original(args);
    };
    const spy = vi
      .spyOn(db.serviceBill, "updateMany")
      // A plain promise stands in for Prisma's lazy one; the caller only awaits it.
      .mockImplementationOnce(reschedulingFirst as unknown as typeof original);

    const summary = await processScheduledPayments({ now: NOW, userId: payer.id });
    spy.mockRestore();

    expect(summary).toEqual({ paid: 0, failed: 0 });
    expect(await billOf(payer.bill)).toMatchObject({
      failedAt: null,
      scheduledCardId: payer.otherArsCard,
    });
  });
});
