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

const { adhereService, confirmBillPayment, reviewBillPayment } = await import("./actions");
const { adhereService: createAdhesion } = await import("./adhesions");

const EMAILS = ["owner@services-actions.test", "stranger@services-actions.test"];
const CARD = { brand: "VISA" as const, holder: "Owner", expiry: "12/30" };

let ars: { id: string; card: string };
let usdCard: string;
let bill: { id: string; amountCents: bigint };
let strangerBill: string;
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

async function firstBill(userId: string) {
  return db.serviceBill.findFirstOrThrow({
    where: { adhesion: { userId } },
    orderBy: { dueDate: "desc" },
  });
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const owner = await db.user.create({
    data: {
      email: EMAILS[0],
      firstName: "Owner",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: [
          {
            currency: "ARS",
            alias: "owner.servicesactions",
            balanceCents: 10_000_000,
            cards: { create: [{ ...CARD, last4: "1111" }] },
          },
          {
            currency: "USD",
            alias: "owner.servicesactions.usd",
            balanceCents: 10_000_000,
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
          alias: "stranger.servicesactions",
          balanceCents: 10_000_000,
          cards: { create: [{ ...CARD, last4: "3333" }] },
        },
      },
    },
    include: { accounts: { include: { cards: true } } },
  });
  current.user = { id: owner.id, name: "Owner" };
  const pesos = owner.accounts.find((a) => a.currency === "ARS")!;
  ars = { id: pesos.id, card: pesos.cards[0].id };
  usdCard = owner.accounts.find((a) => a.currency === "USD")!.cards[0].id;
  strangerCard = stranger.accounts[0].cards[0].id;

  const number = { company: "AYSA" as const, paymentNumber: "0012345678", nickname: "Agua casa" };
  await createAdhesion(owner.id, number);
  await createAdhesion(stranger.id, number);
  bill = await firstBill(owner.id);
  strangerBill = (await firstBill(stranger.id)).id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("adhereService", () => {
  const adhere = (company: string, paymentNumber: string, nickname: string) =>
    adhereService(undefined, form({ company, paymentNumber, nickname }));

  it("saves the adhesion with its bills and opens it", async () => {
    const result = await message(adhere("EDENOR", "1234 5678 9012", "  Luz   oficina "));
    expect(result).toMatch(/^REDIRECT:\/servicios\/[0-9a-f-]{36}$/);
    expect(revalidatePath).toHaveBeenLastCalledWith("/servicios");

    const saved = await db.serviceAdhesion.findFirstOrThrow({
      where: { userId: current.user.id, company: "EDENOR" },
      include: { bills: true },
    });
    expect(result).toBe(`REDIRECT:/servicios/${saved.id}`);
    expect(saved).toMatchObject({ paymentNumber: "123456789012", nickname: "Luz oficina" });
    expect(saved.bills).toHaveLength(2);
  });

  it("rejects a number this user already adhered for that company", async () => {
    expect(await adhere("AYSA", "0012345678", "otra")).toEqual({
      values: { company: "AYSA", paymentNumber: "0012345678", nickname: "otra" },
      errors: { form: "Ya adheriste este servicio con ese número." },
    });
    expect(await db.serviceAdhesion.count({ where: { userId: current.user.id } })).toBe(1);
  });

  it("reports every invalid field and saves nothing", async () => {
    expect(await adhere("METROGAS", "123", "")).toEqual({
      values: { company: "METROGAS", paymentNumber: "123", nickname: "" },
      errors: {
        paymentNumber: "El número de pago electrónico de Metrogas tiene 11 dígitos.",
        nickname: "Poné un nombre para reconocer el servicio.",
      },
    });
    expect(await db.serviceAdhesion.count({ where: { userId: current.user.id } })).toBe(1);
  });
});

describe("reviewBillPayment", () => {
  const review = (fields: Record<string, string> = {}) =>
    reviewBillPayment(undefined, form({ billId: bill.id, cardId: ars.card, ...fields }));

  it("goes to the confirmation with a new key", async () => {
    expect(await message(review())).toMatch(
      new RegExp(`^REDIRECT:/servicios/confirmar\\?bill=${bill.id}&card=${ars.card}&key=[0-9a-f-]{36}$`),
    );
  });

  it.each([
    ["a dollar card", { cardId: "usd" }, "Elegí una tarjeta de tu cuenta en pesos."],
    ["another user's card", { cardId: "stranger" }, "Esta tarjeta ya no está disponible."],
    ["another user's bill", { billId: "strangerBill" }, "Esta factura ya no está disponible."],
    ["a malformed bill", { billId: "../x" }, "Esta factura ya no está disponible."],
  ])("rejects %s with a message", async (_name, fields, error) => {
    const resolved: Record<string, string> = { ...fields };
    if (resolved.cardId === "usd") resolved.cardId = usdCard;
    if (resolved.cardId === "stranger") resolved.cardId = strangerCard;
    if (resolved.billId === "strangerBill") resolved.billId = strangerBill;
    expect(await review(resolved)).toEqual({ error });
  });

  it("rejects a bill above the balance", async () => {
    await db.account.update({ where: { id: ars.id }, data: { balanceCents: 100 } });
    expect(await review()).toEqual({ error: "No tenés saldo suficiente. Disponible: $1" });
  });

  it("rejects a paid bill", async () => {
    await message(
      confirmBillPayment(
        undefined,
        form({ billId: bill.id, cardId: ars.card, idempotencyKey: randomUUID() }),
      ),
    );
    expect(await review()).toEqual({ error: "Esta factura ya está paga." });
  });
});

describe("confirmBillPayment", () => {
  const confirm = (fields: Record<string, string> = {}) =>
    confirmBillPayment(
      undefined,
      form({ billId: bill.id, cardId: ars.card, idempotencyKey: randomUUID(), ...fields }),
    );

  it("pays and goes to the receipt", async () => {
    await expect(confirm()).rejects.toThrow(/^REDIRECT:\/servicios\/comprobante\/[0-9a-f-]{36}$/);
    expect(revalidatePath).toHaveBeenLastCalledWith("/(app)", "layout");
    expect(await balanceOf(ars.id)).toBe(BigInt(10_000_000) - bill.amountCents);
  });

  it.each([
    [{ idempotencyKey: "" }, "La operación expiró. Volvé a intentarlo."],
    [{ cardId: randomUUID() }, "Esta tarjeta ya no está disponible."],
    [{ billId: randomUUID() }, "Esta factura ya no está disponible."],
    [{ billId: "" }, "Esta factura ya no está disponible."],
  ])("rejects %j with a message and moves no money", async (fields, error) => {
    expect(await confirm(fields)).toEqual({ error });
    expect(await balanceOf(ars.id)).toBe(BigInt(10_000_000));
  });

  it("rejects without balance", async () => {
    await db.account.update({ where: { id: ars.id }, data: { balanceCents: 100 } });
    expect(await confirm()).toEqual({ error: "No tenés saldo suficiente para pagar esta factura." });
    expect(await balanceOf(ars.id)).toBe(BigInt(100));
  });

  it("treats the same key in upper case as the same payment", async () => {
    const key = randomUUID();
    const first = await message(confirm({ idempotencyKey: key }));
    const second = await message(confirm({ idempotencyKey: key.toUpperCase() }));

    expect(second).toBe(first);
    expect(await balanceOf(ars.id)).toBe(BigInt(10_000_000) - bill.amountCents);
  });

  it("rejects a second payment of the same bill", async () => {
    await message(confirm());
    expect(await confirm()).toEqual({ error: "Esta factura ya está paga." });
    expect(await balanceOf(ars.id)).toBe(BigInt(10_000_000) - bill.amountCents);
  });

  it("reports a database failure without crashing", async () => {
    const spy = vi.spyOn(db, "$transaction").mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementationOnce(() => {});

    expect(await confirm()).toEqual({
      error: "No pudimos pagar la factura. Probá de nuevo: no se va a cobrar dos veces.",
    });
    spy.mockRestore();
  });
});
