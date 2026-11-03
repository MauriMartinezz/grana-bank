import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getAccount, listAccounts } from "@/features/account/queries";
import { getPaymentCards } from "@/features/services/queries";
import { getPesoPayment } from "@/features/top-ups/queries";
import { transfer } from "@/features/transfers/transfer";
import { db } from "@/lib/db";

const EMAILS = ["owner@default-usage.test", "friend@default-usage.test"];
const CARD = { brand: "VISA" as const, holder: "Test", expiry: "12/39" };
let owner: { id: string; account: string; old: string; chosen: string };
let friend: { id: string; account: string };

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const user = await db.user.create({
    data: {
      email: EMAILS[0],
      firstName: "Owner",
      lastName: "",
      passwordHash: "!",
      accounts: { create: { currency: "ARS", alias: "owner.defaultusage", balanceCents: 100_000 } },
    },
    include: { accounts: true },
  });
  const accountId = user.accounts[0].id;
  const old = await db.card.create({ data: { ...CARD, last4: "1111", accountId } });
  const chosen = await db.card.create({ data: { ...CARD, last4: "2222", accountId } });
  owner = { id: user.id, account: accountId, old: old.id, chosen: chosen.id };
  const other = await db.user.create({
    data: {
      email: EMAILS[1],
      firstName: "Friend",
      lastName: "",
      passwordHash: "!",
      accounts: { create: { currency: "ARS", alias: "friend.defaultusage", balanceCents: 0 } },
    },
    include: { accounts: true },
  });
  friend = { id: other.id, account: other.accounts[0].id };
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

const choose = () =>
  db.account.update({ where: { id: owner.account }, data: { defaultCardId: owner.chosen } });

describe("the default card", () => {
  it("is the oldest card until the user chooses one", async () => {
    expect((await getAccount(owner.id, "ARS"))!.cards.map((c) => c.id)).toEqual([owner.old, owner.chosen]);
  });

  it("comes first on Home and in every payment picker once chosen", async () => {
    await choose();
    expect((await getAccount(owner.id, "ARS"))!.cards[0].id).toBe(owner.chosen);
    expect((await listAccounts(owner.id))[0].cards[0].id).toBe(owner.chosen);
    expect((await getPesoPayment(owner.id))!.cards[0].id).toBe(owner.chosen);
    expect((await getPaymentCards(owner.id, "ARS"))!.cards[0].id).toBe(owner.chosen);
  });

  it("is the card a sent transfer records", async () => {
    await choose();
    const result = await transfer({
      senderId: owner.id,
      recipientAccountId: friend.account,
      amountCents: 100,
      idempotencyKey: randomUUID(),
    });
    if (!result.ok) throw new Error(result.error);
    expect((await db.movement.findUniqueOrThrow({ where: { id: result.movementId } })).cardId).toBe(
      owner.chosen,
    );
  });
});
