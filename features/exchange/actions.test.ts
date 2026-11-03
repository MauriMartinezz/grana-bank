import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { MAX_EXCHANGE_USD_CENTS } from "./rate";

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

const { confirmExchange, openDollarAccount, reviewExchange } = await import("./actions");

const EMAILS = ["trader@exchange-actions.test", "stranger@exchange-actions.test"];
const CARD = { brand: "VISA" as const, holder: "Trader", expiry: "12/30" };

let ars: { id: string; card: string };
let usd: { id: string; card: string };
let strangerCard: string;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function balanceOf(accountId: string) {
  return (await db.account.findUniqueOrThrow({ where: { id: accountId } })).balanceCents;
}

async function message(promise: Promise<unknown>) {
  return promise.then(
    (value) => value,
    (error: Error) => error.message,
  );
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const trader = await db.user.create({
    data: {
      email: EMAILS[0],
      firstName: "Trader",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: [
          {
            currency: "ARS",
            alias: "trader.exchangeactions",
            balanceCents: 450000,
            cards: { create: [{ ...CARD, last4: "1111" }] },
          },
          {
            currency: "USD",
            alias: "trader.exchangeactions.usd",
            balanceCents: 500,
            cards: { create: [{ ...CARD, last4: "2222" }] },
          },
        ],
      },
    },
    include: { accounts: { include: { cards: true } } },
  });
  const stranger = await db.user.create({
    data: {
      email: EMAILS[1],
      firstName: "Stranger",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: {
          currency: "ARS",
          alias: "stranger.exchangeactions",
          balanceCents: 0,
          cards: { create: [{ ...CARD, last4: "3333" }] },
        },
      },
    },
    include: { accounts: { include: { cards: true } } },
  });
  current.user = { id: trader.id, name: "Trader" };
  const pick = (currency: string) => {
    const account = trader.accounts.find((a) => a.currency === currency)!;
    return { id: account.id, card: account.cards[0].id };
  };
  ars = pick("ARS");
  usd = pick("USD");
  strangerCard = stranger.accounts[0].cards[0].id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("openDollarAccount", () => {
  it("opens the dollar account and goes back to the exchange screen", async () => {
    await db.account.delete({ where: { id: usd.id } });

    await expect(openDollarAccount()).rejects.toThrow("REDIRECT:/dolares");
    // Every signed-in screen, but not the login page under (auth).
    expect(revalidatePath).toHaveBeenLastCalledWith("/(app)", "layout");
    expect(
      await db.account.count({ where: { userId: current.user.id, currency: "USD" } }),
    ).toBe(1);
  });

  it("reports a database failure without crashing", async () => {
    const spy = vi.spyOn(db.account, "findUnique").mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect(await openDollarAccount()).toEqual({
      error: "No pudimos abrir la cuenta en dólares. Probá de nuevo.",
    });
    spy.mockRestore();
  });
});

describe("reviewExchange", () => {
  const buying = (amount: string, overrides: Record<string, string> = {}) =>
    reviewExchange(
      undefined,
      form({ direction: "BUY", amount, fromCardId: ars.card, toCardId: usd.card, ...overrides }),
    );

  it("goes to the confirmation with the amount in dollar cents and a fresh key", async () => {
    const first = (await message(buying("1,50"))) as string;
    const second = (await message(buying("1,50"))) as string;

    const pattern = new RegExp(
      `^REDIRECT:/dolares/confirmar\\?direction=BUY&usd=150&from=${ars.card}&to=${usd.card}&key=[0-9a-f-]{36}$`,
    );
    expect(first).toMatch(pattern);
    expect(second).toMatch(pattern);
    expect(first).not.toBe(second);
  });

  it("reads thousands with dots when selling", async () => {
    await db.account.update({ where: { id: usd.id }, data: { balanceCents: 200000 } });

    expect(
      await message(
        reviewExchange(
          undefined,
          form({ direction: "SELL", amount: "1.500", fromCardId: usd.card, toCardId: ars.card }),
        ),
      ),
    ).toMatch(/^REDIRECT:\/dolares\/confirmar\?direction=SELL&usd=150000&/);
  });

  it.each([
    ["", "Ingresá un monto en dólares."],
    ["0", "Ingresá un monto mayor a cero, con hasta 2 decimales."],
    ["12.5", "Ingresá un monto mayor a cero, con hasta 2 decimales."],
    [
      "10.000,01",
      `El máximo por operación es ${formatMoney(MAX_EXCHANGE_USD_CENTS, "USD")}.`,
    ],
    ["3,01", `No tenés saldo suficiente. Disponible: ${formatMoney(450000, "ARS")}`],
  ])("rejects the amount %j with a message", async (amount, error) => {
    expect(await buying(amount)).toEqual({ error });
  });

  it("checks the dollar balance when selling", async () => {
    expect(
      await reviewExchange(
        undefined,
        form({ direction: "SELL", amount: "5,01", fromCardId: usd.card, toCardId: ars.card }),
      ),
    ).toEqual({ error: `No tenés saldo suficiente. Disponible: ${formatMoney(500, "USD")}` });
  });

  it("rejects an unknown direction", async () => {
    expect(await buying("1", { direction: "HOLD" })).toEqual({
      error: "Elegí si querés comprar o vender dólares.",
    });
  });

  it("rejects another user's card", async () => {
    expect(await buying("1", { fromCardId: strangerCard })).toEqual({
      error: "Esta tarjeta ya no está disponible.",
    });
  });

  it("rejects cards of the wrong currency", async () => {
    expect(await buying("1", { fromCardId: usd.card })).toEqual({
      error: "Elegí una tarjeta en pesos y una en dólares.",
    });
  });
});

describe("confirmExchange", () => {
  function confirm(fields: Record<string, string> = {}) {
    return confirmExchange(
      undefined,
      form({
        direction: "BUY",
        usdCents: "100",
        fromCardId: ars.card,
        toCardId: usd.card,
        idempotencyKey: randomUUID(),
        ...fields,
      }),
    );
  }

  it("exchanges and goes to the success screen", async () => {
    await expect(confirm()).rejects.toThrow(/^REDIRECT:\/dolares\/comprobante\/[0-9a-f-]{36}$/);
    expect(revalidatePath).toHaveBeenLastCalledWith("/(app)", "layout");

    expect(await balanceOf(ars.id)).toBe(BigInt(300000));
    expect(await balanceOf(usd.id)).toBe(BigInt(600));
  });

  it.each([
    [{ usdCents: "301" }, "No tenés saldo suficiente para esta operación."],
    [{ usdCents: "0" }, "El monto no es válido. Volvé a ingresarlo."],
    [{ usdCents: "abc" }, "El monto no es válido. Volvé a ingresarlo."],
    [{ direction: "HOLD" }, "Elegí si querés comprar o vender dólares."],
    [{ idempotencyKey: "" }, "La operación expiró. Volvé a intentarlo."],
    [{ toCardId: randomUUID() }, "Esta tarjeta ya no está disponible."],
    [{ toCardId: "" }, "Esta tarjeta ya no está disponible."],
  ])("rejects %j with a message and moves no money", async (fields, error) => {
    expect(await confirm(fields)).toEqual({ error });

    expect(await balanceOf(ars.id)).toBe(BigInt(450000));
    expect(await balanceOf(usd.id)).toBe(BigInt(500));
  });

  it("treats the same key in upper case as the same exchange", async () => {
    const key = randomUUID();
    const first = await message(confirm({ idempotencyKey: key }));
    const second = await message(confirm({ idempotencyKey: key.toUpperCase() }));

    expect(second).toBe(first);
    expect(await balanceOf(usd.id)).toBe(BigInt(600));
  });

  it("reports a database failure without crashing", async () => {
    const spy = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect(await confirm()).toEqual({
      error: "No pudimos completar la operación. Probá de nuevo: no se va a cobrar dos veces.",
    });
    spy.mockRestore();
  });
});
