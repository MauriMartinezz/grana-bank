import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getOwnCard } from "./queries";

const EMAILS = ["owner@cards-queries.test", "other@cards-queries.test"];

let ownerId: string;
let ownerCardId: string;
let otherCardId: string;

function createUser(email: string, last4: string) {
  return db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: {
          currency: "USD",
          alias: `${last4}.cardsqueries.test`,
          balanceCents: 0,
          cards: { create: { brand: "MASTERCARD", last4, holder: "Ana Perez", expiry: "11/27" } },
        },
      },
    },
    include: { accounts: { include: { cards: true } } },
  });
}

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const owner = await createUser(EMAILS[0], "4444");
  ownerId = owner.id;
  ownerCardId = owner.accounts[0].cards[0].id;
  otherCardId = (await createUser(EMAILS[1], "1111")).accounts[0].cards[0].id;
});

afterAll(() => db.user.deleteMany({ where: { email: { in: EMAILS } } }));

describe("getOwnCard", () => {
  it("returns the card face, when it was added and its account", async () => {
    const card = await getOwnCard(ownerId, ownerCardId);
    expect(card).toEqual({
      id: ownerCardId,
      brand: "MASTERCARD",
      last4: "4444",
      holder: "Ana Perez",
      expiry: "11/27",
      createdAt: expect.any(Date),
      // The account's cards and chosen default tell whether this one is the default.
      account: {
        currency: "USD",
        alias: "4444.cardsqueries.test",
        defaultCardId: null,
        cards: [{ id: ownerCardId }],
      },
    });
  });

  it("does not expose another user's card", async () => {
    await expect(getOwnCard(ownerId, otherCardId)).resolves.toBeNull();
  });

  it.each(["00000000-0000-0000-0000-000000000000", "not-a-uuid"])(
    "returns null for the unknown id %j",
    async (id) => {
      await expect(getOwnCard(ownerId, id)).resolves.toBeNull();
    },
  );
});
