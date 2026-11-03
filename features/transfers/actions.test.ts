import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Currency } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

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

const { confirmTransfer, lookupRecipient, reviewAmount, toggleFavorite } =
  await import("./actions");

const EMAILS = ["sender@actions.test", "recipient@actions.test"];
let recipientAccountId: string;
let senderAccountId: string;
let recipientUserId: string;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function createUser(email: string, firstName: string, balanceCents: number) {
  return db.user.create({
    data: {
      email,
      firstName,
      lastName: "",
      passwordHash: "!",
      accounts: { create: { balanceCents, alias: email.replace("@", ".") } },
    },
    include: { accounts: true },
  });
}

function openAccount(userId: string, currency: Currency, alias: string, balanceCents = 0) {
  return db.account.create({ data: { userId, currency, alias, balanceCents } });
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const sender = await createUser(EMAILS[0], "Sender", 10000);
  const recipient = await createUser(EMAILS[1], "Recipient", 0);
  current.user = { id: sender.id, name: sender.firstName };
  senderAccountId = sender.accounts[0].id;
  recipientAccountId = recipient.accounts[0].id;
  recipientUserId = recipient.id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("lookupRecipient", () => {
  it("looks up by alias by default, ignoring case", async () => {
    await expect(
      lookupRecipient(undefined, form({ alias: " RECIPIENT.Actions.Test " })),
    ).rejects.toThrow(`REDIRECT:/transfers/to/${recipientAccountId}`);
  });

  it.each([
    ["", "Ingresá el alias del destinatario."],
    ["a".repeat(41), "El alias tiene hasta 40 caracteres: letras sin tildes, números y puntos, con al menos una letra."],
    ["josé.suárez", "El alias tiene hasta 40 caracteres: letras sin tildes, números y puntos, con al menos una letra."],
    ["123.456", "El alias tiene hasta 40 caracteres: letras sin tildes, números y puntos, con al menos una letra."],
    ["nobody.here", "No encontramos una cuenta con ese alias."],
    ["sender.actions.test", "No podés transferirte a vos mismo."],
  ])("rejects the alias %j with a message and keeps the value", async (alias, error) => {
    expect(await lookupRecipient(undefined, form({ alias }))).toEqual({
      value: alias.trim().toLowerCase(),
      error,
    });
  });

  it("looks up by email when the email option is chosen", async () => {
    await expect(
      lookupRecipient(undefined, form({ by: "email", email: " RECIPIENT@actions.test " })),
    ).rejects.toThrow(`REDIRECT:/transfers/to/${recipientAccountId}`);
  });

  it.each([
    ["", "Ingresá el email del destinatario."],
    ["not-an-email", "Ingresá un email válido."],
    ["nobody@actions.test", "No encontramos una cuenta con ese email."],
    [EMAILS[0], "No podés transferirte a vos mismo."],
  ])("rejects the email %j with a message and keeps the value", async (email, error) => {
    expect(await lookupRecipient(undefined, form({ by: "email", email }))).toEqual({
      value: email.trim().toLowerCase(),
      error,
    });
  });

  it("reports a database failure without crashing", async () => {
    const spy = vi.spyOn(db.user, "findFirst").mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect(await lookupRecipient(undefined, form({ by: "email", email: EMAILS[1] }))).toEqual({
      value: EMAILS[1],
      error: "No pudimos buscar el destinatario. Probá de nuevo.",
    });
    spy.mockRestore();
  });
});

describe("reviewAmount", () => {
  it("goes to the confirmation screen with the amount in cents and a fresh key", async () => {
    const redirectTo = async () =>
      (await reviewAmount(undefined, form({ recipientAccountId, amount: "25,50" })).catch(
        (error: Error) => error.message,
      )) as string;
    const first = await redirectTo();
    const second = await redirectTo();

    const pattern = new RegExp(
      `^REDIRECT:/transfers/to/${recipientAccountId}/confirm\\?amount=2550&key=[0-9a-f-]{36}$`,
    );
    expect(first).toMatch(pattern);
    expect(second).toMatch(pattern);
    expect(first).not.toBe(second);
  });

  it.each([
    ["", "Ingresá un monto."],
    ["0", "Ingresá un monto mayor a cero, con hasta 2 decimales."],
    ["12.5", "Ingresá un monto mayor a cero, con hasta 2 decimales."],
    ["100,01", `No tenés saldo suficiente. Disponible: ${formatMoney(10000, "ARS")}`],
    ["1.234,56", `No tenés saldo suficiente. Disponible: ${formatMoney(10000, "ARS")}`],
  ])("rejects %j with a message and keeps the value", async (amount, error) => {
    expect(await reviewAmount(undefined, form({ recipientAccountId, amount }))).toEqual({
      value: amount,
      error,
    });
  });

  it("checks the balance of the sender's account in the recipient's currency", async () => {
    await openAccount(current.user.id, "USD", "sender.actions.test.usd", 500);
    const usd = await openAccount(recipientUserId, "USD", "recipient.actions.test.usd");

    expect(
      await reviewAmount(undefined, form({ recipientAccountId: usd.id, amount: "6" })),
    ).toEqual({
      value: "6",
      error: `No tenés saldo suficiente. Disponible: ${formatMoney(500, "USD")}`,
    });
  });

  it("rejects a recipient account in a currency the sender has no account in", async () => {
    const usd = await openAccount(recipientUserId, "USD", "recipient.actions.test.usd");

    expect(
      await reviewAmount(undefined, form({ recipientAccountId: usd.id, amount: "1" })),
    ).toEqual({ value: "1", error: "No tenés una cuenta en esa moneda." });
  });
});

describe("confirmTransfer", () => {
  function confirm(amountCents: string, idempotencyKey: string = randomUUID()) {
    return confirmTransfer(
      undefined,
      form({ recipientAccountId, amountCents, idempotencyKey }),
    );
  }

  it("transfers and goes to the success screen", async () => {
    const result = confirm("2550");
    await expect(result).rejects.toThrow(/^REDIRECT:\/transfers\/success\/[0-9a-f-]{36}$/);

    const sender = await db.account.findUniqueOrThrow({ where: { id: senderAccountId } });
    expect(sender.balanceCents).toBe(BigInt(7450));
  });

  it.each([
    ["10001", "No tenés saldo suficiente para esta transferencia."],
    ["0", "El monto no es válido. Volvé a ingresarlo."],
    ["abc", "El monto no es válido. Volvé a ingresarlo."],
  ])("rejects %j with a message and moves no money", async (amountCents, error) => {
    expect(await confirm(amountCents)).toEqual({ error });

    const sender = await db.account.findUniqueOrThrow({ where: { id: senderAccountId } });
    expect(sender.balanceCents).toBe(BigInt(10000));
  });

  it("treats the same key in upper case as the same transfer", async () => {
    const key = randomUUID();
    const first = await confirm("100", key).catch((error: Error) => error.message);
    const second = await confirm("100", key.toUpperCase()).catch((error: Error) => error.message);

    expect(second).toBe(first);
    const sender = await db.account.findUniqueOrThrow({ where: { id: senderAccountId } });
    expect(sender.balanceCents).toBe(BigInt(9900));
  });

  it("says the recipient is no longer available when their account is gone", async () => {
    await db.account.delete({ where: { id: recipientAccountId } });

    expect(await confirm("100")).toEqual({
      error: "Este destinatario ya no está disponible.",
    });
  });

  it("says the sender has no account in the recipient's currency", async () => {
    const usd = await openAccount(recipientUserId, "USD", "recipient.actions.test.usd");

    expect(
      await confirmTransfer(
        undefined,
        form({ recipientAccountId: usd.id, amountCents: "100", idempotencyKey: randomUUID() }),
      ),
    ).toEqual({ error: "No tenés una cuenta en esa moneda." });
  });

  it("rejects a missing idempotency key", async () => {
    expect(await confirm("100", "")).toEqual({
      error: "La operación expiró. Volvé a intentarlo.",
    });
  });

  it("reports a database failure without crashing", async () => {
    const spy = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect(await confirm("100")).toEqual({
      error: "No pudimos completar la transferencia. Probá de nuevo: no se va a cobrar dos veces.",
    });
    spy.mockRestore();
  });
});

describe("toggleFavorite", () => {
  it("marks and unmarks a contact as favorite", async () => {
    await db.contact.create({
      data: { ownerId: current.user.id, contactAccountId: recipientAccountId },
    });

    const favorite = async () =>
      (await db.contact.findFirstOrThrow({ where: { ownerId: current.user.id } }))
        .favorite;

    await toggleFavorite(form({ contactAccountId: recipientAccountId, favorite: "true" }));
    expect(await favorite()).toBe(true);

    await toggleFavorite(form({ contactAccountId: recipientAccountId, favorite: "false" }));
    expect(await favorite()).toBe(false);
  });

  it("reports a database failure instead of throwing", async () => {
    const spy = vi.spyOn(db.contact, "updateMany").mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect(await toggleFavorite(form({ contactAccountId: recipientAccountId, favorite: "true" }))).toEqual({
      ok: false,
    });
    spy.mockRestore();
  });
});
