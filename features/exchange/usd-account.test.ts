import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { isValidAlias } from "@/features/transfers/alias";
import { ALIAS_WORDS } from "@/features/transfers/alias-generator";
import { db } from "@/lib/db";
import { openUsdAccount } from "./usd-account";

const EMAILS = ["holder@usd-account.test", "squatter@usd-account.test"];
const ALIAS = "holder.usdaccount.test";

let userId: string;

async function usdAccounts(id = userId) {
  return db.account.findMany({ where: { userId: id, currency: "USD" }, include: { cards: true } });
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const user = await db.user.create({
    data: {
      email: EMAILS[0],
      firstName: "Holder",
      lastName: "",
      passwordHash: "!",
      accounts: { create: { currency: "ARS", alias: ALIAS, balanceCents: 1000 } },
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("openUsdAccount", () => {
  it("opens an empty dollar account named after the peso alias, without cards", async () => {
    const account = await openUsdAccount(userId);

    expect(account).toMatchObject({
      userId,
      currency: "USD",
      alias: `${ALIAS}.usd`,
      balanceCents: BigInt(0),
    });
    const [stored] = await usdAccounts();
    expect(stored.id).toBe(account.id);
    expect(stored.cards).toEqual([]);
  });

  it("returns the existing account when it is called again", async () => {
    const first = await openUsdAccount(userId);
    await db.account.update({ where: { id: first.id }, data: { balanceCents: 700 } });

    const second = await openUsdAccount(userId);

    expect(second.id).toBe(first.id);
    expect(second.balanceCents).toBe(BigInt(700));
    expect(await usdAccounts()).toHaveLength(1);
  });

  it("opens one account when several requests arrive at once", async () => {
    const accounts = await Promise.all(Array.from({ length: 5 }, () => openUsdAccount(userId)));

    expect(new Set(accounts.map((a) => a.id)).size).toBe(1);
    expect(await usdAccounts()).toHaveLength(1);
  });

  it("generates a valid alias when the peso alias plus .usd is taken", async () => {
    await db.user.create({
      data: {
        email: EMAILS[1],
        firstName: "Squatter",
        lastName: "",
        passwordHash: "!",
        accounts: { create: { currency: "ARS", alias: `${ALIAS}.usd`, balanceCents: 0 } },
      },
    });

    const account = await openUsdAccount(userId);

    expect(account.alias).not.toBe(`${ALIAS}.usd`);
    expect(isValidAlias(account.alias)).toBe(true);
    // A readable default, never a random code.
    expect(account.alias.split(".").every((word) => ALIAS_WORDS.includes(word))).toBe(true);
  });

  it("generates a valid alias when the peso alias plus .usd is too long", async () => {
    const long = "a".repeat(38);
    await db.account.updateMany({ where: { userId }, data: { alias: long } });

    const account = await openUsdAccount(userId);

    expect(account.alias).not.toBe(`${long}.usd`);
    expect(isValidAlias(account.alias)).toBe(true);
  });
});
