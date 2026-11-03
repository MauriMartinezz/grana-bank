import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
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

const { addSubeCard, confirmTopUp, reviewTopUp } = await import("./actions");

const EMAILS = ["rider@top-up-actions.test", "stranger@top-up-actions.test"];
const CARD = { brand: "VISA" as const, holder: "Rider", expiry: "12/30" };

let ars: { id: string; card: string };
let usdCard: string;
let sube: string;
let strangerSube: string;
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
  const rider = await db.user.create({
    data: {
      email: EMAILS[0],
      firstName: "Rider",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: [
          {
            currency: "ARS",
            alias: "rider.topupactions",
            balanceCents: 500_000,
            cards: { create: [{ ...CARD, last4: "1111" }] },
          },
          {
            currency: "USD",
            alias: "rider.topupactions.usd",
            balanceCents: 500_000,
            cards: { create: [{ ...CARD, last4: "2222" }] },
          },
        ],
      },
      subeCards: { create: { number: "6061234567890123", nickname: "sube de mauri" } },
    },
    include: { accounts: { include: { cards: true } }, subeCards: true },
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
          alias: "stranger.topupactions",
          balanceCents: 500_000,
          cards: { create: [{ ...CARD, last4: "3333" }] },
        },
      },
      subeCards: { create: { number: "6061234567890123", nickname: "ajena" } },
    },
    include: { accounts: { include: { cards: true } }, subeCards: true },
  });
  current.user = { id: rider.id, name: "Rider" };
  const pesos = rider.accounts.find((a) => a.currency === "ARS")!;
  ars = { id: pesos.id, card: pesos.cards[0].id };
  usdCard = rider.accounts.find((a) => a.currency === "USD")!.cards[0].id;
  sube = rider.subeCards[0].id;
  strangerSube = stranger.subeCards[0].id;
  strangerCard = stranger.accounts[0].cards[0].id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("addSubeCard", () => {
  const add = (number: string, nickname: string) =>
    addSubeCard(undefined, form({ number, nickname }));

  it("saves the card without spaces and goes back to the list", async () => {
    await expect(add("6061 0000 1111 2222", "  sube  del trabajo ")).rejects.toThrow(
      "REDIRECT:/recargas/sube",
    );
    expect(revalidatePath).toHaveBeenLastCalledWith("/recargas/sube");

    const saved = await db.subeCard.findFirstOrThrow({
      where: { userId: current.user.id, number: "6061000011112222" },
    });
    expect(saved.nickname).toBe("sube del trabajo");
  });

  it("rejects a number this user already saved", async () => {
    expect(await add("6061 2345 6789 0123", "otra")).toEqual({
      values: { number: "6061 2345 6789 0123", nickname: "otra" },
      errors: { form: "Ya agregaste esta tarjeta SUBE." },
    });
    expect(await db.subeCard.count({ where: { userId: current.user.id } })).toBe(1);
  });

  it("lets a user save a number another user saved", async () => {
    await db.subeCard.delete({ where: { id: sube } });

    await expect(add("6061234567890123", "la mía")).rejects.toThrow("REDIRECT:/recargas/sube");
    expect(
      await db.subeCard.count({
        where: { number: "6061234567890123", user: { email: { in: EMAILS } } },
      }),
    ).toBe(2);
  });

  it("reports every invalid field and saves nothing", async () => {
    expect(await add("6062 0000 1111 2222", "")).toEqual({
      values: { number: "6062 0000 1111 2222", nickname: "" },
      errors: {
        number: "El número SUBE tiene 16 dígitos y empieza con 6061.",
        nickname: "Poné un nombre para reconocer la tarjeta.",
      },
    });
    expect(await db.subeCard.count({ where: { userId: current.user.id } })).toBe(1);
  });
});

describe("reviewTopUp", () => {
  const review = (fields: Record<string, string>) => reviewTopUp(undefined, form(fields));
  // Placeholders, because it.each tables are built before the users exist.
  const subeFields = (overrides: Record<string, string> = {}) => ({
    kind: "SUBE",
    provider: "SUBE",
    target: "sube",
    amount: "1.500",
    cardId: "ars",
    ...overrides,
  });
  const resolve = (fields: Record<string, string>) => {
    const ids: Record<string, string> = {
      sube,
      ars: ars.card,
      usd: usdCard,
      stranger: strangerCard,
      strangerSube,
    };
    return Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, ids[value] ?? value]),
    );
  };

  it("goes to the confirmation with cents and a fresh key", async () => {
    const first = (await message(review(resolve(subeFields())))) as string;
    const second = (await message(review(resolve(subeFields())))) as string;

    const pattern = new RegExp(
      `^REDIRECT:/recargas/confirmar\\?kind=SUBE&provider=SUBE&target=${sube}&amount=150000&card=${ars.card}&key=[0-9a-f-]{36}$`,
    );
    expect(first).toMatch(pattern);
    expect(second).toMatch(pattern);
    expect(first).not.toBe(second);
  });

  it("normalizes the phone number before the confirmation", async () => {
    expect(
      await message(
        review({
          kind: "PHONE",
          provider: "TUENTI",
          target: "+54 9 351 123-4567",
          amount: "100",
          cardId: ars.card,
        }),
      ),
    ).toMatch(/^REDIRECT:\/recargas\/confirmar\?kind=PHONE&provider=TUENTI&target=3511234567&amount=10000&/);
  });

  it("normalizes the DirecTV account before the confirmation", async () => {
    expect(
      await message(
        review({
          kind: "DIRECTV",
          provider: "DIRECTV",
          target: "1234 5678 90",
          amount: "2.000",
          cardId: ars.card,
        }),
      ),
    ).toMatch(/^REDIRECT:\/recargas\/confirmar\?kind=DIRECTV&provider=DIRECTV&target=1234567890&amount=200000&/);
  });

  it.each([
    ["no amount", subeFields({ amount: "" }), "Ingresá cuánto querés cargar."],
    ["below the minimum", subeFields({ amount: "99" }), "El mínimo es $100 y el máximo $50.000."],
    [
      "a dot decimal",
      subeFields({ amount: "100.5" }),
      "Ingresá un monto válido, por ejemplo 1.500 o 2.000,50.",
    ],
    ["more than the balance", subeFields({ amount: "5.000,01" }), "No tenés saldo suficiente. Disponible: $5.000"],
    ["a dollar card", subeFields({ cardId: "usd" }), "Elegí una tarjeta de tu cuenta en pesos."],
    ["another user's card", subeFields({ cardId: "stranger" }), "Esta tarjeta ya no está disponible."],
    ["another user's SUBE card", subeFields({ target: "strangerSube" }), "Esta tarjeta SUBE ya no está disponible."],
    ["an unknown kind", subeFields({ kind: "GAS" }), "Elegí qué querés recargar."],
    [
      "no phone company",
      { kind: "PHONE", provider: "", target: "1112345678", amount: "100", cardId: "x" },
      "Elegí la compañía.",
    ],
    [
      "no phone number",
      { kind: "PHONE", provider: "CLARO", target: " ", amount: "100", cardId: "x" },
      "Ingresá el número de teléfono.",
    ],
    [
      "a foreign phone number",
      { kind: "PHONE", provider: "CLARO", target: "+1 555 123 4567", amount: "100", cardId: "x" },
      "Ingresá un número de Argentina con código de área, por ejemplo 11 1234 5678.",
    ],
    [
      "a short DirecTV account",
      { kind: "DIRECTV", provider: "DIRECTV", target: "1234", amount: "100", cardId: "x" },
      "El número de cliente tiene de 8 a 12 dígitos.",
    ],
  ])("rejects %s with a message", async (_name, fields, error) => {
    expect(await review(resolve(fields))).toEqual({ error });
  });
});

describe("confirmTopUp", () => {
  function confirm(fields: Record<string, string> = {}) {
    return confirmTopUp(
      undefined,
      form({
        kind: "SUBE",
        provider: "SUBE",
        target: sube,
        amountCents: "10000",
        cardId: ars.card,
        idempotencyKey: randomUUID(),
        ...fields,
      }),
    );
  }

  it("tops up and goes to the receipt", async () => {
    await expect(confirm()).rejects.toThrow(/^REDIRECT:\/recargas\/comprobante\/[0-9a-f-]{36}$/);
    expect(revalidatePath).toHaveBeenLastCalledWith("/(app)", "layout");
    expect(await balanceOf(ars.id)).toBe(BigInt(490_000));
  });

  it.each([
    [{ amountCents: "500001" }, "No tenés saldo suficiente para esta recarga."],
    [{ amountCents: "9999" }, "El monto no es válido. Volvé a ingresarlo."],
    [{ amountCents: "abc" }, "El monto no es válido. Volvé a ingresarlo."],
    [{ kind: "GAS" }, "Elegí qué querés recargar."],
    [{ idempotencyKey: "" }, "La operación expiró. Volvé a intentarlo."],
    [{ cardId: randomUUID() }, "Esta tarjeta ya no está disponible."],
    [{ target: randomUUID() }, "Esta tarjeta SUBE ya no está disponible."],
    [{ provider: "CLARO" }, "Los datos de la recarga no son válidos. Volvé a cargarlos."],
  ])("rejects %j with a message and moves no money", async (fields, error) => {
    await db.account.update({ where: { id: ars.id }, data: { balanceCents: 500_000 } });

    expect(await confirm(fields)).toEqual({ error });
    expect(await balanceOf(ars.id)).toBe(BigInt(500_000));
  });

  it("treats the same key in upper case as the same top-up", async () => {
    const key = randomUUID();
    const first = await message(confirm({ idempotencyKey: key }));
    const second = await message(confirm({ idempotencyKey: key.toUpperCase() }));

    expect(second).toBe(first);
    expect(await balanceOf(ars.id)).toBe(BigInt(490_000));
  });

  it("rejects the same key with another amount", async () => {
    const key = randomUUID();
    await message(confirm({ idempotencyKey: key }));

    expect(await confirm({ idempotencyKey: key, amountCents: "20000" })).toEqual({
      error: "La operación expiró. Volvé a intentarlo.",
    });
    expect(await balanceOf(ars.id)).toBe(BigInt(490_000));
  });

  it("reports a database failure without crashing", async () => {
    const spy = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect(await confirm()).toEqual({
      error: "No pudimos completar la recarga. Probá de nuevo: no se va a cobrar dos veces.",
    });
    spy.mockRestore();
  });
});
