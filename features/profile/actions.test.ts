import { createHash } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "@/features/auth/password";
import { SESSION_COOKIE } from "@/features/auth/session-cookie";
import { db } from "@/lib/db";
import { PROFILE_MESSAGES } from "./validation";

const current = vi.hoisted(() => ({ user: { id: "" }, sessionToken: "" }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === SESSION_COOKIE && current.sessionToken
        ? { name, value: current.sessionToken }
        : undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  RedirectType: { push: "push", replace: "replace" },
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/current-user", () => ({
  getCurrentUser: async () => current.user,
}));

const { changePassword, updateAlias, updateEmail, updateProfile, updatePreferredCurrency } =
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
    await expect(
      updateProfile(
        undefined,
        form({ firstName: " María ", lastName: "Muñoz", address: " Calle 1 ", phone: "11 1234 5678" }),
      ),
    ).rejects.toThrow("REDIRECT:/perfil?guardado=datos");
    expect(await owner()).toMatchObject({
      firstName: "María",
      lastName: "Muñoz",
      address: "Calle 1",
      phone: "11 1234 5678",
    });
  });

  it("stores empty optional fields as null", async () => {
    await db.user.update({ where: { id: ownerId }, data: { address: "Vieja", phone: "12345678" } });
    await expect(
      updateProfile(undefined, form({ firstName: "Ana", lastName: "Pérez", address: " ", phone: "" })),
    ).rejects.toThrow("REDIRECT:/perfil?guardado=datos");
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
    await expect(updatePreferredCurrency(undefined, form({ currency: "USD" }))).rejects.toThrow(
      "REDIRECT:/perfil?guardado=moneda",
    );
    expect((await owner()).preferredCurrency).toBe("USD");
  });
});

describe("updateEmail", () => {
  it("changes the email, normalized, with the right password", async () => {
    await expect(
      updateEmail(undefined, form({ email: "  NEW@Profile-Actions.test ", password: PASSWORD })),
    ).rejects.toThrow("REDIRECT:/perfil?guardado=email");
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

  it("says the email is already the user's own and writes nothing", async () => {
    const before = await owner();

    expect(
      await updateEmail(undefined, form({ email: ` ${EMAILS[0].toUpperCase()} `, password: PASSWORD })),
    ).toEqual({ value: EMAILS[0], errors: { email: PROFILE_MESSAGES.emailSame } });
    expect(await owner()).toEqual(before);
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
    await expect(
      updateAlias(undefined, form({ accountId: ownerArsAccountId, alias: " Ana.Nueva.Profile " })),
    ).rejects.toThrow("REDIRECT:/perfil?guardado=alias");
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

describe("changePassword", () => {
  const NEW_PASSWORD = "nueva-clave-456";
  const CURRENT_TOKEN = "current-profile-actions-token";

  function tokenHash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  async function storedHash() {
    return (await owner()).passwordHash;
  }

  function change(fields: Partial<Record<"current" | "next" | "confirmation", string>>) {
    return changePassword(
      undefined,
      form({ current: PASSWORD, next: NEW_PASSWORD, confirmation: NEW_PASSWORD, ...fields }),
    );
  }

  beforeEach(async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    current.sessionToken = CURRENT_TOKEN;
    await db.session.createMany({
      data: [
        { userId: ownerId, tokenHash: tokenHash(CURRENT_TOKEN), expiresAt },
        { userId: ownerId, tokenHash: tokenHash("other-device-profile-actions"), expiresAt },
      ],
    });
  });

  it("stores the new password, keeps this session and closes the others", async () => {
    const otherUserSessions = await db.session.count({
      where: { user: { email: EMAILS[1] } },
    });

    await expect(change({})).rejects.toThrow("REDIRECT:/perfil?guardado=contrasena");

    const hash = await storedHash();
    expect(hash).not.toBe(passwordHash);
    expect(await verifyPassword(NEW_PASSWORD, hash)).toBe(true);
    expect(await verifyPassword(PASSWORD, hash)).toBe(false);
    const sessions = await db.session.findMany({ where: { userId: ownerId } });
    expect(sessions.map((session) => session.tokenHash)).toEqual([tokenHash(CURRENT_TOKEN)]);
    expect(await db.session.count({ where: { user: { email: EMAILS[1] } } })).toBe(
      otherUserSessions,
    );
  });

  async function expectUnchanged() {
    expect(await storedHash()).toBe(passwordHash);
    expect(await db.session.count({ where: { userId: ownerId } })).toBe(2);
  }

  it("rejects a wrong current password, never echoing passwords", async () => {
    const state = await change({ current: "equivocada-1" });

    expect(state).toEqual({ errors: { current: PROFILE_MESSAGES.currentPasswordWrong } });
    expect(JSON.stringify(state)).not.toContain("equivocada-1");
    expect(JSON.stringify(state)).not.toContain(NEW_PASSWORD);
    await expectUnchanged();
  });

  it("requires the current password", async () => {
    expect(await change({ current: "" })).toEqual({
      errors: { current: PROFILE_MESSAGES.passwordEmpty },
    });
    await expectUnchanged();
  });

  it("rejects a new password shorter than 8 characters", async () => {
    expect(await change({ next: "corta12", confirmation: "corta12" })).toEqual({
      errors: { next: PROFILE_MESSAGES.newPasswordShort },
    });
    await expectUnchanged();
  });

  it("rejects a new password longer than 128 characters", async () => {
    const long = "a".repeat(129);
    expect(await change({ next: long, confirmation: long })).toEqual({
      errors: { next: PROFILE_MESSAGES.newPasswordLong },
    });
    await expectUnchanged();
  });

  it("rejects a confirmation that does not match", async () => {
    expect(await change({ confirmation: "otra-clave-789" })).toEqual({
      errors: { confirmation: PROFILE_MESSAGES.passwordMismatch },
    });
    await expectUnchanged();
  });

  it("rejects a new password equal to the current one", async () => {
    expect(await change({ next: PASSWORD, confirmation: PASSWORD })).toEqual({
      errors: { next: PROFILE_MESSAGES.newPasswordSame },
    });
    await expectUnchanged();
  });
});
