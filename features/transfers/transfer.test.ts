import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { MAX_TRANSFER_CENTS } from "./amount";
import { findSentMovementByKey, transfer } from "./transfer";

const EMAILS = ["sender@transfer.test", "recipient@transfer.test"];

async function createUser(email: string, name: string, balanceCents: number) {
  return db.user.create({
    data: {
      email,
      name,
      passwordHash: "!",
      account: {
        create: {
          balanceCents,
          cardBrand: "VISA",
          cardLast4: "0000",
          cardHolder: name,
          cardExpiry: "01/30",
        },
      },
    },
  });
}

async function balanceOf(userId: string) {
  const account = await db.account.findUniqueOrThrow({ where: { userId } });
  return account.balanceCents;
}

async function snapshot() {
  return {
    accounts: await db.account.findMany({
      where: { user: { email: { in: EMAILS } } },
      orderBy: { id: "asc" },
    }),
    movements: await db.movement.count({
      where: { account: { user: { email: { in: EMAILS } } } },
    }),
    transfers: await db.transfer.count({
      where: { fromAccount: { user: { email: { in: EMAILS } } } },
    }),
    contacts: await db.contact.findMany({
      where: { owner: { email: { in: EMAILS } } },
    }),
  };
}

let sender: { id: string };
let recipient: { id: string };

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  sender = await createUser(EMAILS[0], "Sender", 10000);
  recipient = await createUser(EMAILS[1], "Recipient", 500);
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

function send(amountCents: number, from = sender.id, to = recipient.id) {
  return transfer({
    senderId: from,
    recipientId: to,
    amountCents,
    idempotencyKey: randomUUID(),
  });
}

describe("transfer", () => {
  it("moves the money and records both sides with one reference", async () => {
    const result = await send(2550);

    expect(result.ok).toBe(true);
    expect(await balanceOf(sender.id)).toBe(7450);
    expect(await balanceOf(recipient.id)).toBe(3050);

    const movements = await db.movement.findMany({
      where: { transferId: { not: null }, account: { userId: { in: [sender.id, recipient.id] } } },
      include: { account: true },
    });
    const sent = movements.find((m) => m.account.userId === sender.id);
    const received = movements.find((m) => m.account.userId === recipient.id);

    expect(movements).toHaveLength(2);
    expect(sent).toMatchObject({ type: "SENT", counterparty: "Recipient", amountCents: 2550 });
    expect(received).toMatchObject({ type: "RECEIVED", counterparty: "Sender", amountCents: 2550 });
    expect(sent?.reference).toMatch(/^TRF-\d{6,}$/);
    expect(received?.reference).toBe(sent?.reference);
    expect(result.ok && result.movementId).toBe(sent?.id);
  });

  it("saves the recipient as a contact without touching an existing favorite", async () => {
    await send(100);
    const [contact] = (await snapshot()).contacts;
    expect(contact).toMatchObject({ ownerId: sender.id, contactId: recipient.id, favorite: false });

    await db.contact.update({ where: { id: contact.id }, data: { favorite: true } });
    await send(100);

    const contacts = (await snapshot()).contacts;
    expect(contacts).toHaveLength(1);
    expect(contacts[0].favorite).toBe(true);
  });

  it.each([
    ["the balance is insufficient", () => send(10001), "INSUFFICIENT_FUNDS"],
    ["the amount is zero", () => send(0), "INVALID_AMOUNT"],
    ["the amount is negative", () => send(-100), "INVALID_AMOUNT"],
    ["the amount is not an integer", () => send(10.5), "INVALID_AMOUNT"],
    ["the amount is above the limit", () => send(MAX_TRANSFER_CENTS + 1), "INVALID_AMOUNT"],
    ["the recipient is the sender", () => send(100, sender.id, sender.id), "SELF_TRANSFER"],
    ["the recipient does not exist", () => send(100, sender.id, randomUUID()), "RECIPIENT_NOT_FOUND"],
  ])("rejects when %s and changes nothing", async (_case, run, error) => {
    const before = await snapshot();

    expect(await run()).toEqual({ ok: false, error });
    expect(await snapshot()).toEqual(before);
  });

  it("allows spending the whole balance", async () => {
    expect((await send(10000)).ok).toBe(true);
    expect(await balanceOf(sender.id)).toBe(0);
  });

  it("creates one transfer when the same request arrives twice", async () => {
    const request = {
      senderId: sender.id,
      recipientId: recipient.id,
      amountCents: 1000,
      idempotencyKey: randomUUID(),
    };

    const [first, second] = await Promise.all([transfer(request), transfer(request)]);

    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    expect((await snapshot()).transfers).toBe(1);
    expect(await balanceOf(sender.id)).toBe(9000);
  });

  it("finds the sent movement of an already used key, only for its sender", async () => {
    const idempotencyKey = randomUUID();
    expect(await findSentMovementByKey(sender.id, idempotencyKey)).toBeNull();

    const result = await transfer({
      senderId: sender.id,
      recipientId: recipient.id,
      amountCents: 100,
      idempotencyKey,
    });

    expect(await findSentMovementByKey(sender.id, idempotencyKey)).toBe(
      result.ok && result.movementId,
    );
    expect(await findSentMovementByKey(recipient.id, idempotencyKey)).toBeNull();
  });

  it("rejects a reused key with a different amount or recipient", async () => {
    const third = await createUser("third@transfer.test", "Third", 0);
    try {
      const idempotencyKey = randomUUID();
      const base = { senderId: sender.id, recipientId: recipient.id, amountCents: 1000, idempotencyKey };
      expect((await transfer(base)).ok).toBe(true);
      const before = await snapshot();

      expect(await transfer({ ...base, amountCents: 2000 })).toEqual({
        ok: false,
        error: "IDEMPOTENCY_MISMATCH",
      });
      expect(await transfer({ ...base, recipientId: third.id })).toEqual({
        ok: false,
        error: "IDEMPOTENCY_MISMATCH",
      });
      expect(await snapshot()).toEqual(before);
    } finally {
      await db.user.delete({ where: { id: third.id } });
    }
  });

  it("never takes the balance below zero under concurrent transfers", async () => {
    const results = await Promise.all([send(6000), send(6000), send(6000)]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([
      { ok: false, error: "INSUFFICIENT_FUNDS" },
      { ok: false, error: "INSUFFICIENT_FUNDS" },
    ]);
    expect(await balanceOf(sender.id)).toBe(4000);
    expect(await balanceOf(recipient.id)).toBe(6500);
  });

  it("does not deadlock when two users send to each other at once", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        i % 2 === 0 ? send(100) : send(100, recipient.id, sender.id),
      ),
    );

    expect(results.every((r) => r.ok)).toBe(true);
    expect(await balanceOf(sender.id)).toBe(10000);
    expect(await balanceOf(recipient.id)).toBe(500);
  });
});
