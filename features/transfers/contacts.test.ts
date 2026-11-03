import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  findRecipientByAlias,
  findRecipientByEmail,
  getRecipient,
  listContacts,
  setFavorite,
} from "./contacts";

const EMAILS = [
  "owner@contacts.test",
  "zoe@contacts.test",
  "ana@contacts.test",
  "noaccount@contacts.test",
  "stranger@contacts.test",
];

let owner: { id: string };
let zoe: { id: string };
let ana: { id: string };
let noAccount: { id: string };
let stranger: { id: string };

function createUser(email: string, name: string, withAccount = true) {
  return db.user.create({
    data: {
      email,
      name,
      passwordHash: "!",
      account: withAccount
        ? {
            create: {
              balanceCents: 0,
              alias: email.replace("@", "."),
              cardBrand: "VISA",
              cardLast4: "0000",
              cardHolder: name,
              cardExpiry: "01/30",
            },
          }
        : undefined,
    },
  });
}

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0], "Owner");
  zoe = await createUser(EMAILS[1], "Zoe");
  ana = await createUser(EMAILS[2], "Ana");
  noAccount = await createUser(EMAILS[3], "No Account", false);
  stranger = await createUser(EMAILS[4], "Stranger");
  await db.contact.createMany({
    data: [
      { ownerId: owner.id, contactId: zoe.id },
      { ownerId: owner.id, contactId: ana.id },
      { ownerId: stranger.id, contactId: owner.id },
    ],
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("listContacts", () => {
  it("lists only the owner's contacts, favorites first, then by name", async () => {
    expect((await listContacts(owner.id)).map((c) => c.name)).toEqual(["Ana", "Zoe"]);

    await setFavorite(owner.id, zoe.id, true);
    const contacts = await listContacts(owner.id);

    expect(contacts.map((c) => [c.name, c.favorite])).toEqual([
      ["Zoe", true],
      ["Ana", false],
    ]);
    expect(contacts[0]).toEqual({
      userId: zoe.id,
      name: "Zoe",
      email: EMAILS[1],
      alias: "zoe.contacts.test",
      favorite: true,
    });
  });
});

describe("setFavorite", () => {
  it("can remove a favorite again", async () => {
    await setFavorite(owner.id, ana.id, true);
    expect(await setFavorite(owner.id, ana.id, false)).toBe(true);

    const ana_ = (await listContacts(owner.id)).find((c) => c.userId === ana.id);
    expect(ana_?.favorite).toBe(false);
  });

  it("never changes another user's contact", async () => {
    expect(await setFavorite(owner.id, owner.id, true)).toBe(false);

    const theirs = await db.contact.findFirstOrThrow({ where: { ownerId: stranger.id } });
    expect(theirs.favorite).toBe(false);
  });
});

describe("findRecipientByEmail", () => {
  it("finds a user with an account, ignoring case and spaces", async () => {
    expect(await findRecipientByEmail(owner.id, "  ANA@contacts.test ")).toEqual({
      ok: true,
      recipient: { userId: ana.id, name: "Ana", email: EMAILS[2], alias: "ana.contacts.test" },
    });
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
  it("finds a user with an account, ignoring case and spaces", async () => {
    expect(await findRecipientByAlias(owner.id, "  ANA.Contacts.TEST ")).toEqual({
      ok: true,
      recipient: { userId: ana.id, name: "Ana", email: EMAILS[2], alias: "ana.contacts.test" },
    });
  });

  it.each([
    ["the sender", "owner.contacts.test", "SELF_TRANSFER"],
    ["an unknown alias", "nobody.here", "RECIPIENT_NOT_FOUND"],
  ])("rejects %s", async (_case, alias, error) => {
    expect(await findRecipientByAlias(owner.id, alias)).toEqual({ ok: false, error });
  });
});

describe("getRecipient", () => {
  it("returns a user with an account who is not the sender", async () => {
    expect(await getRecipient(owner.id, zoe.id)).toEqual({
      userId: zoe.id,
      name: "Zoe",
      email: EMAILS[1],
      alias: "zoe.contacts.test",
    });
    expect(await getRecipient(owner.id, owner.id)).toBeNull();
    expect(await getRecipient(owner.id, noAccount.id)).toBeNull();
    expect(await getRecipient(owner.id, "not-a-uuid")).toBeNull();
  });
});
