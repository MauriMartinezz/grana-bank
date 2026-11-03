import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getSubscription, listPreviousCharges, listSubscriptions } from "./queries";

const EMAILS = ["owner@subscriptions-queries.test", "stranger@subscriptions-queries.test"];
const NOW = new Date("2026-11-10T15:00:00Z");
const CARD = { brand: "VISA" as const, last4: "1111", holder: "Test", expiry: "12/30" };

async function createUser(email: string, alias: string) {
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
  return { id: user.id, account: user.accounts[0].id, card: user.accounts[0].cards[0].id };
}

function subscription(
  user: { id: string; card: string },
  merchant: string,
  billingDay: number,
  cancelledAt?: Date,
) {
  return db.subscription.create({
    data: {
      userId: user.id,
      merchant,
      amountCents: BigInt(1_000),
      cardId: user.card,
      billingDay,
      ...(cancelledAt && { status: "CANCELLED" as const, cancelledAt }),
    },
  });
}

let owner: Awaited<ReturnType<typeof createUser>>;
let stranger: Awaited<ReturnType<typeof createUser>>;

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0], "owner.subscriptionsqueries");
  stranger = await createUser(EMAILS[1], "stranger.subscriptionsqueries");
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("listSubscriptions", () => {
  it("lists the user's active ones by next charge, then the cancelled newest first", async () => {
    await subscription(owner, "Early", 5); // next charge December 5
    await subscription(owner, "Soon", 20); // November 20
    await subscription(owner, "Today", 10); // today
    await subscription(owner, "OldCancel", 1, new Date("2026-09-01T12:00:00Z"));
    await subscription(owner, "NewCancel", 1, new Date("2026-10-01T12:00:00Z"));
    await subscription(stranger, "Theirs", 15);

    const list = await listSubscriptions(owner.id, NOW);
    expect(list.map((item) => item.merchant)).toEqual([
      "Today",
      "Soon",
      "Early",
      "NewCancel",
      "OldCancel",
    ]);
    expect(list[0].nextCharge).toEqual(new Date(Date.UTC(2026, 10, 10)));
    expect(list[3].nextCharge).toBeNull();
  });
});

describe("getSubscription", () => {
  it("returns the owner's subscription with its card and never another user's", async () => {
    const mine = await subscription(owner, "Mine", 5);
    const theirs = await subscription(stranger, "Theirs", 5);

    expect(await getSubscription(owner.id, mine.id)).toMatchObject({
      merchant: "Mine",
      card: { id: owner.card, last4: "1111", account: { currency: "ARS" } },
    });
    expect(await getSubscription(owner.id, theirs.id)).toBeNull();
    expect(await getSubscription(owner.id, "not-a-uuid")).toBeNull();
  });
});

describe("listPreviousCharges", () => {
  it("lists the owner's subscription movements of that merchant, newest first", async () => {
    const movement = (accountId: string, type: "SUBSCRIPTION" | "SENT", counterparty: string, day: number) =>
      db.movement.create({
        data: {
          accountId,
          type,
          counterparty,
          amountCents: BigInt(1_000),
          reference: `GB-SQ-${accountId.slice(0, 4)}-${counterparty}-${type}-${day}`,
          occurredAt: new Date(Date.UTC(2026, 9, day)),
        },
      });
    const older = await movement(owner.account, "SUBSCRIPTION", "Adobe", 1);
    const newer = await movement(owner.account, "SUBSCRIPTION", "Adobe", 20);
    await movement(owner.account, "SUBSCRIPTION", "Figma", 21);
    await movement(owner.account, "SENT", "Adobe", 22);
    await movement(stranger.account, "SUBSCRIPTION", "Adobe", 23);

    const charges = await listPreviousCharges(owner.id, "Adobe");
    expect(charges.map((charge) => charge.id)).toEqual([newer.id, older.id]);
  });
});
