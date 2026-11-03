import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/features/auth/password";
import { db } from "@/lib/db";
import { PROFILE_MESSAGES } from "./validation";

const current = vi.hoisted(() => ({ user: { id: "" } }));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/current-user", () => ({
  getCurrentUser: async () => current.user,
}));

const { updateAlias, updateEmail, updateProfile, updatePreferredCurrency } =
  await import("./actions");

const EMAILS = ["owner@profile-actions.test", "other@profile-actions.test", "new@profile-actions.test"];
const PASSWORD = "secreto123";
let passwordHash: string;
let ownerId: string;
let ownerArsAccountId: string;
let otherAccountId: string;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function owner() {
  return db.user.findUniqueOrThrow({ where: { id: ownerId }, include: { accounts: true } });
}

beforeEach(async () => {
  passwordHash ??= await hashPassword(PASSWORD);
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const ownerUser = await db.user.create({
    data: {
      email: EMAILS[0],
      firstName: "Ana",
      lastName: "Pérez",
      passwordHash,
      accounts: { create: { alias: "owner.profile.actions", currency: "ARS", balanceCents: 0 } },
    },
    include: { accounts: true },
  });
  const other = await db.user.create({
    data: {
      email: EMAILS[1],
      firstName: "Otro",
      lastName: "Usuario",
      passwordHash,
      accounts: { create: { alias: "other.profile.actions", currency: "ARS", balanceCents: 0 } },
    },
    include: { accounts: true },
  });
  ownerId = ownerUser.id;
  ownerArsAccountId = ownerUser.accounts[0].id;
  otherAccountId = other.accounts[0].id;
  current.user = { id: ownerId };
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("updateProfile", () => {
  it("persists the cleaned names, address and phone", async () => {
    const state = await updateProfile(
      undefined,
      form({ firstName: " María ", lastName: "Muñoz", address: " Calle 1 ", phone: "11 1234 5678" }),
    );

    expect(state).toEqual({
      values: { firstName: "María", lastName: "Muñoz", address: "Calle 1", phone: "11 1234 5678" },
      errors: {},
      saved: true,
    });
    expect(await owner()).toMatchObject({
      firstName: "María",
      lastName: "Muñoz",
      address: "Calle 1",
      phone: "11 1234 5678",
    });
  });

  it("stores empty optional fields as null", async () => {
    await db.user.update({ where: { id: ownerId }, data: { address: "Vieja", phone: "12345678" } });
    await updateProfile(
      undefined,
      form({ firstName: "Ana", lastName: "Pérez", address: " ", phone: "" }),
    );
    expect(await owner()).toMatchObject({ address: null, phone: null });
  });

  it("returns per-field errors, keeps the typed values and changes nothing", async () => {
    const state = await updateProfile(
      undefined,
      form({ firstName: "", lastName: "Pérez", address: "", phone: "abc" }),
    );

    expect(state).toEqual({
      values: { firstName: "", lastName: "Pérez", address: "", phone: "abc" },
      errors: { firstName: PROFILE_MESSAGES.firstNameEmpty, phone: PROFILE_MESSAGES.phoneInvalid },
    });
    expect(await owner()).toMatchObject({ firstName: "Ana", phone: null });
  });
});

describe("updatePreferredCurrency", () => {
  it("rejects a currency the user has no account in", async () => {
    expect(await updatePreferredCurrency(undefined, form({ currency: "USD" }))).toEqual({
      value: "USD",
      error: PROFILE_MESSAGES.currencyInvalid,
    });
    expect((await owner()).preferredCurrency).toBe("ARS");
  });

  it("saves a currency the user has an account in", async () => {
    await db.account.create({
      data: { userId: ownerId, alias: "owner.usd.profile.actions", currency: "USD", balanceCents: 0 },
    });
    expect(await updatePreferredCurrency(undefined, form({ currency: "USD" }))).toEqual({
      value: "USD",
      saved: true,
    });
    expect((await owner()).preferredCurrency).toBe("USD");
  });
});

describe("updateEmail", () => {
  it("changes the email, normalized, with the right password", async () => {
    const state = await updateEmail(
      undefined,
      form({ email: "  NEW@Profile-Actions.test ", password: PASSWORD }),
    );

    expect(state).toEqual({ value: EMAILS[2], errors: {}, saved: true });
    expect((await owner()).email).toBe(EMAILS[2]);
  });

  it("rejects a wrong password and changes nothing", async () => {
    const state = await updateEmail(undefined, form({ email: EMAILS[2], password: "otra" }));

    expect(state).toEqual({ value: EMAILS[2], errors: { password: PROFILE_MESSAGES.passwordWrong } });
    expect(JSON.stringify(state)).not.toContain("otra");
    expect((await owner()).email).toBe(EMAILS[0]);
  });

  it("requires the password", async () => {
    expect(await updateEmail(undefined, form({ email: EMAILS[2], password: "" }))).toEqual({
      value: EMAILS[2],
      errors: { password: PROFILE_MESSAGES.passwordEmpty },
    });
  });

  it("rejects an email already in use", async () => {
    expect(await updateEmail(undefined, form({ email: EMAILS[1], password: PASSWORD }))).toEqual({
      value: EMAILS[1],
      errors: { email: PROFILE_MESSAGES.emailTaken },
    });
    expect((await owner()).email).toBe(EMAILS[0]);
  });

  it("rejects an invalid email", async () => {
    expect(await updateEmail(undefined, form({ email: "nope", password: PASSWORD }))).toEqual({
      value: "nope",
      errors: { email: PROFILE_MESSAGES.emailInvalid },
    });
  });
});

describe("updateAlias", () => {
  it("changes the alias of an account the user owns, normalized", async () => {
    const state = await updateAlias(
      undefined,
      form({ accountId: ownerArsAccountId, alias: " Ana.Nueva.Profile " }),
    );

    expect(state).toEqual({ value: "ana.nueva.profile", saved: true });
    expect((await owner()).accounts[0].alias).toBe("ana.nueva.profile");
  });

  it("validates the alias with the transfer screen rule", async () => {
    expect(
      await updateAlias(undefined, form({ accountId: ownerArsAccountId, alias: "josé" })),
    ).toEqual({ value: "josé", error: PROFILE_MESSAGES.aliasInvalid });
  });

  it("rejects an alias another user has", async () => {
    expect(
      await updateAlias(
        undefined,
        form({ accountId: ownerArsAccountId, alias: "OTHER.profile.actions" }),
      ),
    ).toEqual({ value: "other.profile.actions", error: PROFILE_MESSAGES.aliasTaken });
    expect((await owner()).accounts[0].alias).toBe("owner.profile.actions");
  });

  it("never changes another user's account", async () => {
    expect(
      await updateAlias(undefined, form({ accountId: otherAccountId, alias: "stolen.profile" })),
    ).toEqual({ value: "stolen.profile", error: PROFILE_MESSAGES.accountNotFound });
    expect((await db.account.findUniqueOrThrow({ where: { id: otherAccountId } })).alias).toBe(
      "other.profile.actions",
    );
  });
});
