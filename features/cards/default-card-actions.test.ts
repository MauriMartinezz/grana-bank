import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const current = vi.hoisted(() => ({ user: { id: "", name: "" } }));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/current-user", () => ({
  getCurrentUser: async () => current.user,
}));

const { setDefaultCard } = await import("./actions");

const EMAILS = ["owner@default-card.test", "stranger@default-card.test"];
const CARD = { brand: "VISA" as const, holder: "Test", expiry: "12/39" };
let account: string;
let first: string;
let second: string;
let strangerCard: string;
let strangerAccount: string;

async function createUser(email: string, alias: string, last4s: string[]) {
  const user = await db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: { currency: "ARS", alias, balanceCents: 0 },
      },
    },
    include: { accounts: true },
  });
  const accountId = user.accounts[0].id;
  const ids: string[] = [];
  for (const last4 of last4s) {
    ids.push((await db.card.create({ data: { ...CARD, last4, accountId } })).id);
  }
  return { userId: user.id, accountId, ids };
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const owner = await createUser(EMAILS[0], "owner.defaultcard", ["1111", "2222"]);
  const stranger = await createUser(EMAILS[1], "stranger.defaultcard", ["3333"]);
  current.user = { id: owner.userId, name: "Owner" };
  account = owner.accountId;
  [first, second] = owner.ids;
  strangerCard = stranger.ids[0];
  strangerAccount = stranger.accountId;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

function form(cardId: string) {
  const data = new FormData();
  data.set("cardId", cardId);
  return data;
}

async function defaultOf(accountId: string) {
  return (await db.account.findUniqueOrThrow({ where: { id: accountId } })).defaultCardId;
}

describe("setDefaultCard", () => {
  it("makes the user's card the default of its account and stays on its page", async () => {
    await expect(setDefaultCard(form(second))).rejects.toThrow(`REDIRECT:/tarjetas/${second}`);
    expect(await defaultOf(account)).toBe(second);
    await expect(setDefaultCard(form(first))).rejects.toThrow(`REDIRECT:/tarjetas/${first}`);
    expect(await defaultOf(account)).toBe(first);
  });

  it("never touches another user's card or account", async () => {
    await expect(setDefaultCard(form(strangerCard))).rejects.toThrow("REDIRECT:/tarjetas");
    expect(await defaultOf(strangerAccount)).toBeNull();
    expect(await defaultOf(account)).toBeNull();
  });

  it("clears the default when its card is removed", async () => {
    await db.account.update({ where: { id: account }, data: { defaultCardId: second } });
    await db.card.delete({ where: { id: second } });
    expect(await defaultOf(account)).toBeNull();
  });
});
