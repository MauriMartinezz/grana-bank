import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  findRecipientByAlias,
  findRecipientByEmail,
  getRecipient,
  isContact,
  listContacts,
  setFavorite,
} from "./contacts";

const EMAILS = [
  "owner@contacts.test",
  "zoe@contacts.test",
  "ana@contacts.test",
  "noaccount@contacts.test",
  "stranger@contacts.test",
  "dollars@contacts.test",
];

type TestUser = { id: string; accounts: Record<string, string> };

let owner: TestUser;
let zoe: TestUser;
let ana: TestUser;
let noAccount: TestUser;
let stranger: TestUser;
let dollars: TestUser;

function aliasOf(email: string, currency: Currency) {
  const base = email.replace("@", ".");
  return currency === "ARS" ? base : `${base}.usd`;
}

async function createUser(
  email: string,
  firstName: string,
  currencies: Currency[] = ["ARS"],
  preferredCurrency: Currency = "ARS",
): Promise<TestUser> {
  const user = await db.user.create({
    data: {
      email,
      firstName,
      lastName: "",
      preferredCurrency,
      passwordHash: "!",
      accounts: {
        create: currencies.map((currency) => ({
          currency,
          balanceCents: 0,
          alias: aliasOf(email, currency),
        })),
      },
    },
    include: { accounts: true },
  });
  return {
    id: user.id,
    accounts: Object.fromEntries(user.accounts.map((a) => [a.currency, a.id])),
  };
}

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0], "Owner");
  zoe = await createUser(EMAILS[1], "Zoe");
  ana = await createUser(EMAILS[2], "Ana");
  noAccount = await createUser(EMAILS[3], "No Account", []);
  stranger = await createUser(EMAILS[4], "Stranger");
  dollars = await createUser(EMAILS[5], "Dollars", ["ARS", "USD"], "USD");
  await db.contact.createMany({
    data: [
      { ownerId: owner.id, contactAccountId: zoe.accounts.ARS },
      { ownerId: owner.id, contactAccountId: ana.accounts.ARS },
      { ownerId: stranger.id, contactAccountId: owner.accounts.ARS },
    ],
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("listContacts", () => {
  it("lists only the owner's contacts, favorites first, then by name", async () => {
    expect((await listContacts(owner.id)).map((c) => c.name)).toEqual(["Ana", "Zoe"]);

    await setFavorite(owner.id, zoe.accounts.ARS, true);
    const contacts = await listContacts(owner.id);

    expect(contacts.map((c) => [c.name, c.favorite])).toEqual([
      ["Zoe", true],
      ["Ana", false],
    ]);
    expect(contacts[0]).toEqual({
      accountId: zoe.accounts.ARS,
      userId: zoe.id,
      name: "Zoe",
      email: EMAILS[1],
      alias: "zoe.contacts.test",
      currency: "ARS",
      favorite: true,
    });
  });
});

describe("listContacts by account", () => {
  it("lists each saved account of a person on its own, with its currency", async () => {
    await db.contact.createMany({
      data: [
        { ownerId: owner.id, contactAccountId: dollars.accounts.USD },
        { ownerId: owner.id, contactAccountId: dollars.accounts.ARS },
      ],
    });
    try {
      const theirs = (await listContacts(owner.id)).filter((c) => c.userId === dollars.id);
      expect(theirs.map((c) => [c.alias, c.currency])).toEqual([
        ["dollars.contacts.test", "ARS"],
        ["dollars.contacts.test.usd", "USD"],
      ]);
    } finally {
      await db.contact.deleteMany({ where: { ownerId: owner.id, contactAccount: { userId: dollars.id } } });
    }
  });

  it("drops the contact when its account is closed", async () => {
    const closing = await db.account.create({
      data: { userId: ana.id, currency: "USD", alias: "ana.contacts.test.usd", balanceCents: 0 },
    });
    await db.contact.create({ data: { ownerId: owner.id, contactAccountId: closing.id } });

    await db.account.delete({ where: { id: closing.id } });

    const accounts = (await listContacts(owner.id)).map((c) => c.accountId);
    expect(accounts).not.toContain(closing.id);
    expect(accounts).toHaveLength(2);
  });
});

describe("setFavorite", () => {
  it("can remove a favorite again", async () => {
    await setFavorite(owner.id, ana.accounts.ARS, true);
    expect(await setFavorite(owner.id, ana.accounts.ARS, false)).toBe(true);

    const ana_ = (await listContacts(owner.id)).find((c) => c.userId === ana.id);
    expect(ana_?.favorite).toBe(false);
  });

  it("never changes another user's contact", async () => {
    expect(await setFavorite(owner.id, owner.accounts.ARS, true)).toBe(false);

    const theirs = await db.contact.findFirstOrThrow({ where: { ownerId: stranger.id } });
    expect(theirs.favorite).toBe(false);
  });
});

describe("findRecipientByEmail", () => {
  it("finds a user's account, ignoring case and spaces", async () => {
    expect(await findRecipientByEmail(owner.id, "  ANA@contacts.test ")).toEqual({
      ok: true,
      recipient: {
        accountId: ana.accounts.ARS,
        userId: ana.id,
        name: "Ana",
        email: EMAILS[2],
        alias: "ana.contacts.test",
        currency: "ARS",
      },
    });
  });

  it("picks the account in the user's preferred currency", async () => {
    const result = await findRecipientByEmail(owner.id, EMAILS[5]);
    expect(result.ok && result.recipient.accountId).toBe(dollars.accounts.USD);
  });

  it.each([
    ["the sender", EMAILS[0], "SELF_TRANSFER"],
    ["an unknown email", "nobody@contacts.test", "RECIPIENT_NOT_FOUND"],
    ["a user without account", EMAILS[3], "RECIPIENT_NOT_FOUND"],
  ])("rejects %s", async (_case, email, error) => {
    expect(await findRecipientByEmail(owner.id, email)).toEqual({ ok: false, error });
  });
});

describe("findRecipientByAlias", () => {
  it("finds the account with that alias, ignoring case and spaces", async () => {
    expect(await findRecipientByAlias(owner.id, "  ANA.Contacts.TEST ")).toEqual({
      ok: true,
      recipient: {
        accountId: ana.accounts.ARS,
        userId: ana.id,
        name: "Ana",
        email: EMAILS[2],
        alias: "ana.contacts.test",
        currency: "ARS",
      },
    });
  });

  it("finds a dollar account by its own alias", async () => {
    const result = await findRecipientByAlias(owner.id, "dollars.contacts.test.usd");
    expect(result.ok && [result.recipient.accountId, result.recipient.currency]).toEqual([
      dollars.accounts.USD,
      "USD",
    ]);
  });

  it.each([
    ["the sender", "owner.contacts.test", "SELF_TRANSFER"],
    ["an unknown alias", "nobody.here", "RECIPIENT_NOT_FOUND"],
  ])("rejects %s", async (_case, alias, error) => {
    expect(await findRecipientByAlias(owner.id, alias)).toEqual({ ok: false, error });
  });
});

describe("getRecipient", () => {
  it("returns an account someone else owns", async () => {
    expect(await getRecipient(owner.id, zoe.accounts.ARS)).toEqual({
      accountId: zoe.accounts.ARS,
      userId: zoe.id,
      name: "Zoe",
      email: EMAILS[1],
      alias: "zoe.contacts.test",
      currency: "ARS",
    });
    expect(await getRecipient(owner.id, owner.accounts.ARS)).toBeNull();
    expect(await getRecipient(owner.id, noAccount.id)).toBeNull();
    expect(await getRecipient(owner.id, "not-a-uuid")).toBeNull();
  });
});

describe("isContact", () => {
  it("tells whether the account is one of the owner's contacts", async () => {
    expect(await isContact(owner.id, zoe.accounts.ARS)).toBe(true);
    expect(await isContact(owner.id, dollars.accounts.ARS)).toBe(false);
    // Another user's contact list does not count.
    expect(await isContact(zoe.id, owner.accounts.ARS)).toBe(false);
  });
});
