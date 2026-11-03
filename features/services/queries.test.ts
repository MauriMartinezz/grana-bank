import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adhereService } from "./adhesions";
import { listFailedBills, listUpcomingBills } from "./queries";

const EMAILS = ["owner@services-queries.test", "stranger@services-queries.test"];
const NOW = new Date("2026-11-10T15:00:00Z");
const CARD = { brand: "VISA" as const, last4: "1111", holder: "Test", expiry: "12/30" };

async function createUser(email: string, alias: string, numbers: string[]) {
  const user = await db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: { currency: "ARS", alias, balanceCents: 0, cards: { create: [CARD] } },
      },
    },
    include: { accounts: { include: { cards: true } } },
  });
  const adhesions: string[] = [];
  for (const paymentNumber of numbers) {
    const adhered = await adhereService(
      user.id,
      { company: "AYSA", paymentNumber, nickname: `Agua ${paymentNumber}` },
      NOW,
    );
    if (!adhered.ok) throw new Error(adhered.error);
    adhesions.push(adhered.adhesionId);
  }
  return { id: user.id, card: user.accounts[0].cards[0].id, adhesions };
}

function billsOf(adhesionId: string) {
  return db.serviceBill.findMany({ where: { adhesionId }, orderBy: { dueDate: "asc" } });
}

let owner: Awaited<ReturnType<typeof createUser>>;
let stranger: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0], "owner.servicesqueries", ["1000000001", "1000000002", "1000000003"]);
  stranger = await createUser(EMAILS[1], "stranger.servicesqueries", ["1000000004"]);
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("listUpcomingBills", () => {
  it("lists the user's next 3 pending bills that nothing pays by itself, by due date", async () => {
    const [first, second, third] = owner.adhesions;
    // Paid, scheduled and auto-debited bills are left out.
    const [paid] = await billsOf(first);
    await db.serviceBill.update({ where: { id: paid.id }, data: { status: "PAID", paidAt: NOW } });
    const [scheduled] = await billsOf(second);
    await db.serviceBill.update({
      where: { id: scheduled.id },
      data: { scheduledFor: new Date("2026-11-15T00:00:00Z"), scheduledCardId: owner.card },
    });
    await db.serviceAdhesion.update({ where: { id: third }, data: { autoDebitCardId: owner.card } });

    const bills = await listUpcomingBills(owner.id);

    const expected = [...(await billsOf(first)).slice(1), ...(await billsOf(second)).slice(1)];
    expect(bills.map((bill) => bill.id).sort()).toEqual(expected.map((bill) => bill.id).sort());
    const dueDates = bills.map((bill) => bill.dueDate.getTime());
    expect(dueDates).toEqual([...dueDates].sort((a, b) => a - b));
  });

  it("takes at most 3 bills and never another user's", async () => {
    const bills = await listUpcomingBills(owner.id);

    expect(bills).toHaveLength(3);
    const strangerBills = (await billsOf(stranger.adhesions[0])).map((bill) => bill.id);
    expect(bills.some((bill) => strangerBills.includes(bill.id))).toBe(false);
  });
});

describe("listFailedBills", () => {
  it("lists only the user's pending bills that failed", async () => {
    const [failed, other] = await billsOf(owner.adhesions[0]);
    await db.serviceBill.update({
      where: { id: failed.id },
      data: { failedAt: NOW, failureReason: "INSUFFICIENT_FUNDS" },
    });
    const [strangerFailed] = await billsOf(stranger.adhesions[0]);
    await db.serviceBill.update({
      where: { id: strangerFailed.id },
      data: { failedAt: NOW, failureReason: "CARD_UNAVAILABLE" },
    });

    const bills = await listFailedBills(owner.id);

    expect(bills.map((bill) => bill.id)).toEqual([failed.id]);
    expect(bills[0].failureReason).toBe("INSUFFICIENT_FUNDS");
    expect(bills.some((bill) => bill.id === other.id)).toBe(false);
  });
});
