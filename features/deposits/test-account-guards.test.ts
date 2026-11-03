import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: vi.fn(), get: vi.fn(), delete: vi.fn() }),
}));

const { hashPassword } = await import("@/features/auth/password");
const { login } = await import("@/features/auth/actions");
const { findRecipientByAlias, findRecipientByEmail, getRecipient } = await import(
  "@/features/transfers/contacts"
);
const { transfer } = await import("@/features/transfers/transfer");

// A second test-account user, only for these checks: it has the flag and a
// real password, so only the flag can keep it out.
const GUARDED = "guarded@test-account.test";
const SENDER = "sender@test-account.test";
const PASSWORD = "una-contraseña-larga";

let guardedAccount: string;
let sender: string;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: [GUARDED, SENDER] } } });
  const passwordHash = await hashPassword(PASSWORD);
  const guarded = await db.user.create({
    data: {
      email: GUARDED,
      firstName: "Guarded",
      lastName: "",
      passwordHash,
      isTestAccount: true,
      accounts: { create: { alias: "guarded.testaccount", balanceCents: 1_000 } },
    },
    include: { accounts: true },
  });
  guardedAccount = guarded.accounts[0].id;
  const created = await db.user.create({
    data: {
      email: SENDER,
      firstName: "Sender",
      lastName: "",
      passwordHash,
      accounts: { create: { alias: "sender.testaccount", balanceCents: 1_000 } },
    },
  });
  sender = created.id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: [GUARDED, SENDER] } } });
});

describe("the test account", () => {
  it("never signs in, even with its password", async () => {
    expect(await login(undefined, form({ email: GUARDED, password: PASSWORD }))).toMatchObject({
      errors: { form: "Email o contraseña incorrectos." },
    });
  });

  it("lets a regular user sign in as before", async () => {
    await expect(login(undefined, form({ email: SENDER, password: PASSWORD }))).rejects.toThrow(
      /^REDIRECT:/,
    );
  });

  it("is never found as a recipient", async () => {
    expect(await findRecipientByAlias(sender, "guarded.testaccount")).toEqual({
      ok: false,
      error: "RECIPIENT_NOT_FOUND",
    });
    expect(await findRecipientByEmail(sender, GUARDED)).toEqual({
      ok: false,
      error: "RECIPIENT_NOT_FOUND",
    });
    expect(await getRecipient(sender, guardedAccount)).toBeNull();
  });

  it("never receives a transfer", async () => {
    expect(
      await transfer({
        senderId: sender,
        recipientAccountId: guardedAccount,
        amountCents: 100,
        idempotencyKey: randomUUID(),
      }),
    ).toEqual({ ok: false, error: "RECIPIENT_NOT_FOUND" });
    expect(
      (await db.account.findUniqueOrThrow({ where: { id: guardedAccount } })).balanceCents,
    ).toBe(BigInt(1_000));
  });
});
