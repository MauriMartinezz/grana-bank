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

const { addCard } = await import("./actions");
const { listCardsByAccount } = await import("./queries");

const EMAILS = ["owner@cards-actions.test", "other@cards-actions.test"];
const NUMBER = "5555555555554444";
const CVV = "987";
let arsAccountId: string;
let usdAccountId: string;
let otherAccountId: string;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

function cardForm(fields: Record<string, string> = {}) {
  return form({
    number: "5555 5555 5555 4444",
    holder: " Ana  Pérez ",
    expiry: "12/39",
    cvv: CVV,
    accountId: arsAccountId,
    ...fields,
  });
}

async function submit(fields: Record<string, string> = {}) {
  return addCard(undefined, cardForm(fields)).catch((error: Error) => error.message);
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const owner = await db.user.create({
    data: {
      email: EMAILS[0],
      firstName: "Ana",
      lastName: "Pérez",
      passwordHash: "!",
      accounts: {
        create: [
          { alias: "ana.cards.ars", currency: "ARS", balanceCents: 0 },
          { alias: "ana.cards.usd", currency: "USD", balanceCents: 0 },
        ],
      },
    },
    include: { accounts: true },
  });
  const other = await db.user.create({
    data: {
      email: EMAILS[1],
      firstName: "Otro",
      lastName: "",
      passwordHash: "!",
      accounts: { create: { alias: "otro.cards.ars", currency: "ARS", balanceCents: 0 } },
    },
    include: { accounts: true },
  });
  current.user = { id: owner.id, name: "Ana Pérez" };
  arsAccountId = owner.accounts.find((a) => a.currency === "ARS")!.id;
  usdAccountId = owner.accounts.find((a) => a.currency === "USD")!.id;
  otherAccountId = other.accounts[0].id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("addCard", () => {
  it("stores only the card face and goes back to the card list", async () => {
    expect(await submit({ accountId: usdAccountId })).toBe("REDIRECT:/tarjetas");

    const cards = await db.card.findMany({ where: { accountId: usdAccountId } });
    expect(cards).toHaveLength(1);
    const { id, createdAt, ...stored } = cards[0];
    expect(id).toEqual(expect.any(String));
    expect(createdAt).toBeInstanceOf(Date);
    expect(stored).toEqual({
      accountId: usdAccountId,
      brand: "MASTERCARD",
      last4: "4444",
      holder: "Ana Pérez",
      expiry: "12/39",
    });

    // No column holds the rest of the number or the security code.
    const row = JSON.stringify(cards[0]);
    expect(row).not.toContain(NUMBER.slice(0, 12));
    expect(row).not.toContain("555555");
    expect(row).not.toContain(CVV);
  });

  it("lets the user add more cards and lists them grouped by account", async () => {
    await submit();
    await submit({ number: "378282246310005", cvv: "1234", holder: "Ana Perez" });
    await submit({ number: "4111111111111111", accountId: usdAccountId });

    const accounts = await listCardsByAccount(current.user.id);
    expect(
      accounts.map((account) => ({
        currency: account.currency,
        alias: account.alias,
        cards: account.cards.map((card) => `${card.brand} ${card.last4}`),
      })),
    ).toEqual([
      { currency: "ARS", alias: "ana.cards.ars", cards: ["MASTERCARD 4444", "AMEX 0005"] },
      { currency: "USD", alias: "ana.cards.usd", cards: ["VISA 1111"] },
    ]);
  });

  it("rejects another user's account and stores nothing", async () => {
    const state = await submit({ accountId: otherAccountId });

    expect(state).toEqual({
      values: { holder: "Ana Pérez", expiry: "12/39", accountId: otherAccountId },
      errors: { accountId: "Elegí una de tus cuentas." },
    });
    expect(await db.card.count({ where: { accountId: otherAccountId } })).toBe(0);
  });

  it("rejects an account that does not exist", async () => {
    expect(await submit({ accountId: "" })).toEqual({
      values: { holder: "Ana Pérez", expiry: "12/39", accountId: "" },
      errors: { accountId: "Elegí una de tus cuentas." },
    });
  });

  it("rejects the same card on the same account", async () => {
    expect(await submit()).toBe("REDIRECT:/tarjetas");

    expect(await submit()).toEqual({
      values: { holder: "Ana Pérez", expiry: "12/39", accountId: arsAccountId },
      errors: { form: "Esta tarjeta ya está agregada a esa cuenta." },
    });
    expect(await db.card.count({ where: { accountId: arsAccountId } })).toBe(1);

    // Another expiry is a replacement card, and another account is allowed.
    expect(await submit({ expiry: "11/39" })).toBe("REDIRECT:/tarjetas");
    expect(await submit({ accountId: usdAccountId })).toBe("REDIRECT:/tarjetas");
  });

  it("validates again on the server and keeps the typed values", async () => {
    const state = await submit({
      number: "30569309025904",
      holder: "Ana 2",
      expiry: "01/20",
      cvv: "12",
    });

    expect(state).toEqual({
      values: { holder: "Ana 2", expiry: "01/20", accountId: arsAccountId },
      errors: {
        number: "Solo aceptamos Visa, Mastercard o American Express.",
        holder: "El nombre solo puede tener letras y espacios.",
        expiry: "La tarjeta está vencida.",
        cvv: "El código de seguridad no es válido.",
      },
    });
    expect(await db.card.count({ where: { accountId: arsAccountId } })).toBe(0);
  });

  it("never returns the card number or the security code", async () => {
    const states = [
      await submit({ number: "4111111111111112", cvv: "321" }),
      await submit({ accountId: otherAccountId }),
      await submit({ holder: "" }),
    ];
    await submit();
    states.push(await submit());

    for (const state of states) {
      expect(state).toEqual(expect.objectContaining({ values: expect.any(Object) }));
      // The account id is a UUID, whose digits could match by chance.
      const text = JSON.stringify(state).replaceAll(arsAccountId, "").replaceAll(otherAccountId, "");
      expect(text).not.toMatch(/\d{5,}/);
      expect(text).not.toContain("321");
      expect(text).not.toContain(CVV);
      expect(Object.keys((state as { values: object }).values).sort()).toEqual([
        "accountId",
        "expiry",
        "holder",
      ]);
    }
  });

  it("reports a database failure without logging the card number", async () => {
    const spy = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await submit()).toEqual({
      values: { holder: "Ana Pérez", expiry: "12/39", accountId: arsAccountId },
      errors: { form: "No pudimos agregar la tarjeta. Probá de nuevo." },
    });
    expect(JSON.stringify(log.mock.calls.map((call) => call.map(String)))).not.toContain(
      NUMBER.slice(0, 12),
    );
    spy.mockRestore();
    log.mockRestore();
  });
});
