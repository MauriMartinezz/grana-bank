import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getOwnAccount } from "./queries";

const EMAILS = ["owner@profile-queries.test", "other@profile-queries.test"];
let ownerId: string;
let ownerAccountId: string;
let otherAccountId: string;

function createUser(email: string, alias: string) {
  return db.user.create({
    data: {
      email,
      firstName: "Ana",
      lastName: "Pérez",
      passwordHash: "!",
      accounts: { create: { alias, currency: "ARS", balanceCents: 0 } },
    },
    include: { accounts: true },
  });
}

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const owner = await createUser(EMAILS[0], "owner.profile.queries");
  const other = await createUser(EMAILS[1], "other.profile.queries");
  ownerId = owner.id;
  ownerAccountId = owner.accounts[0].id;
  otherAccountId = other.accounts[0].id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("getOwnAccount", () => {
  it("returns the user's own account for the alias screen", async () => {
    expect(await getOwnAccount(ownerId, ownerAccountId)).toEqual({
      id: ownerAccountId,
      alias: "owner.profile.queries",
      currency: "ARS",
    });
  });

  it("returns null for another user's account, so the screen shows not found", async () => {
    expect(await getOwnAccount(ownerId, otherAccountId)).toBeNull();
  });

  it("returns null for an id that is not an account", async () => {
    expect(await getOwnAccount(ownerId, "not-an-account")).toBeNull();
  });
});
