import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const { cancelScheduledPayment, processMyScheduledPayments, saveAutoDebit, saveReminder, scheduleBillPayment } =
  await import("./actions");
const { adhereService } = await import("./adhesions");

const EMAILS = ["owner@schedule-actions.test", "stranger@schedule-actions.test"];
const CARD = { brand: "VISA" as const, holder: "Owner", expiry: "12/30" };
const NOW = new Date("2026-11-10T15:00:00Z");
const TODAY = new Date("2026-11-10T00:00:00Z");
const DUE = new Date("2026-11-20T00:00:00Z");

let arsCard: string;
let usdCard: string;
let arsAccount: string;
let adhesion: string;
let bill: string;
let strangerBill: string;
let strangerAdhesion: string;
let strangerCard: string;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function message(promise: Promise<unknown>) {
  return promise.then(
    (value) => value,
    (error: Error) => error.message,
  );
}

async function billOf(id: string) {
  return db.serviceBill.findUniqueOrThrow({ where: { id } });
}

async function createUser(email: string, alias: string, last4: string, withUsd: boolean) {
  const user = await db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: [
          {
            currency: "ARS",
            alias,
            balanceCents: 10_000_000,
            cards: { create: [{ ...CARD, last4 }] },
          },
          ...(withUsd
            ? [
                {
                  currency: "USD" as const,
                  alias: `${alias}.usd`,
                  balanceCents: 10_000_000,
                  cards: { create: [{ ...CARD, last4: "2222" }] },
                },
              ]
            : []),
        ],
      },
    },
    include: { accounts: { include: { cards: true } } },
  });
  const adhered = await adhereService(
    user.id,
    { company: "EDESUR", paymentNumber: "0012345678", nickname: "Luz depto" },
    NOW,
  );
  if (!adhered.ok) throw new Error(adhered.error);
  // One pending bill, due on DUE, so the dates of the tests are fixed.
  const bills = await db.serviceBill.findMany({
    where: { adhesionId: adhered.adhesionId },
    orderBy: { dueDate: "asc" },
  });
  await db.serviceBill.delete({ where: { id: bills[0].id } });
  await db.serviceBill.update({
    where: { id: bills[1].id },
    data: { dueDate: DUE, amountCents: 1_000_000 },
  });
  return { user, adhesionId: adhered.adhesionId, billId: bills[1].id };
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(revalidatePath).mockClear();
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  const owner = await createUser(EMAILS[0], "owner.scheduleactions", "1111", true);
  const stranger = await createUser(EMAILS[1], "stranger.scheduleactions", "3333", false);
  current.user = { id: owner.user.id, name: "Owner" };
  const pesos = owner.user.accounts.find((a) => a.currency === "ARS")!;
  arsAccount = pesos.id;
  arsCard = pesos.cards[0].id;
  usdCard = owner.user.accounts.find((a) => a.currency === "USD")!.cards[0].id;
  adhesion = owner.adhesionId;
  bill = owner.billId;
  strangerAdhesion = stranger.adhesionId;
  strangerBill = stranger.billId;
  strangerCard = stranger.user.accounts[0].cards[0].id;
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("scheduleBillPayment", () => {
  it("schedules the bill with its card, clears a failure and opens the service", async () => {
    await db.serviceBill.update({
      where: { id: bill },
      data: { failedAt: NOW, failureReason: "INSUFFICIENT_FUNDS" },
    });

    const result = await message(
      scheduleBillPayment(undefined, form({ billId: bill, cardId: arsCard, date: "2026-11-15" })),
    );

    expect(result).toBe(`REDIRECT:/servicios/${adhesion}`);
    expect(await billOf(bill)).toMatchObject({
      scheduledFor: new Date("2026-11-15T00:00:00Z"),
      scheduledCardId: arsCard,
      failedAt: null,
      failureReason: null,
    });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("rejects a date before today or after the due date and saves nothing", async () => {
    expect(
      await scheduleBillPayment(
        undefined,
        form({ billId: bill, cardId: arsCard, date: "2026-11-09" }),
      ),
    ).toEqual({ error: "La fecha no puede ser anterior a hoy." });
    expect(
      await scheduleBillPayment(
        undefined,
        form({ billId: bill, cardId: arsCard, date: "2026-11-21" }),
      ),
    ).toEqual({ error: "Elegí una fecha hasta el vencimiento, el 20 de noviembre de 2026." });
    expect((await billOf(bill)).scheduledFor).toBeNull();
  });

  it("rejects another user's bill or card and a card of another currency", async () => {
    const date = "2026-11-15";
    expect(
      await scheduleBillPayment(undefined, form({ billId: strangerBill, cardId: arsCard, date })),
    ).toEqual({ error: "Esta factura ya no está disponible." });
    expect(
      await scheduleBillPayment(undefined, form({ billId: bill, cardId: strangerCard, date })),
    ).toEqual({ error: "Esta tarjeta ya no está disponible." });
    expect(
      await scheduleBillPayment(undefined, form({ billId: bill, cardId: usdCard, date })),
    ).toEqual({ error: "Elegí una tarjeta de tu cuenta en pesos." });
    expect((await billOf(bill)).scheduledFor).toBeNull();
    expect((await billOf(strangerBill)).scheduledFor).toBeNull();
  });

  it("rejects a paid bill", async () => {
    await db.serviceBill.update({ where: { id: bill }, data: { status: "PAID", paidAt: NOW } });

    expect(
      await scheduleBillPayment(
        undefined,
        form({ billId: bill, cardId: arsCard, date: "2026-11-15" }),
      ),
    ).toEqual({ error: "Esta factura ya está paga." });
    expect((await billOf(bill)).scheduledFor).toBeNull();
  });
});

describe("cancelScheduledPayment", () => {
  it("clears the schedule and the failure of the user's bill", async () => {
    await db.serviceBill.update({
      where: { id: bill },
      data: {
        scheduledFor: DUE,
        scheduledCardId: arsCard,
        failedAt: NOW,
        failureReason: "INSUFFICIENT_FUNDS",
      },
    });

    expect(await message(cancelScheduledPayment(form({ billId: bill })))).toBe(
      `REDIRECT:/servicios/${adhesion}`,
    );
    expect(await billOf(bill)).toMatchObject({
      scheduledFor: null,
      scheduledCardId: null,
      failedAt: null,
    });
  });

  it("leaves another user's bill untouched", async () => {
    await db.serviceBill.update({
      where: { id: strangerBill },
      data: { scheduledFor: DUE, scheduledCardId: strangerCard },
    });

    expect(await message(cancelScheduledPayment(form({ billId: strangerBill })))).toBe(
      "REDIRECT:/servicios",
    );
    expect((await billOf(strangerBill)).scheduledFor).toEqual(DUE);
  });
});

describe("saveAutoDebit", () => {
  it("turns the automatic debit on with a card and clears failures to retry them", async () => {
    await db.serviceBill.update({
      where: { id: bill },
      data: { failedAt: NOW, failureReason: "INSUFFICIENT_FUNDS" },
    });

    expect(
      await saveAutoDebit(undefined, form({ adhesionId: adhesion, cardId: arsCard })),
    ).toEqual({ notice: "Débito automático activado." });
    expect(
      (await db.serviceAdhesion.findUniqueOrThrow({ where: { id: adhesion } })).autoDebitCardId,
    ).toBe(arsCard);
    expect((await billOf(bill)).failedAt).toBeNull();
  });

  it("turns it off with an empty card", async () => {
    await db.serviceAdhesion.update({ where: { id: adhesion }, data: { autoDebitCardId: arsCard } });

    expect(await saveAutoDebit(undefined, form({ adhesionId: adhesion, cardId: "" }))).toEqual({
      notice: "Débito automático desactivado.",
    });
    expect(
      (await db.serviceAdhesion.findUniqueOrThrow({ where: { id: adhesion } })).autoDebitCardId,
    ).toBeNull();
  });

  it("rejects another user's adhesion or card and a card of another currency", async () => {
    expect(
      await saveAutoDebit(undefined, form({ adhesionId: strangerAdhesion, cardId: arsCard })),
    ).toEqual({ error: "Este servicio ya no está disponible." });
    expect(
      await saveAutoDebit(undefined, form({ adhesionId: adhesion, cardId: strangerCard })),
    ).toEqual({ error: "Esta tarjeta ya no está disponible." });
    expect(await saveAutoDebit(undefined, form({ adhesionId: adhesion, cardId: usdCard }))).toEqual(
      { error: "Elegí una tarjeta de tu cuenta en pesos." },
    );
    const adhesions = await db.serviceAdhesion.findMany({
      where: { id: { in: [adhesion, strangerAdhesion] } },
    });
    expect(adhesions.every((a) => a.autoDebitCardId === null)).toBe(true);
  });
});

describe("processMyScheduledPayments", () => {
  it("pays only the user's due payments and says how it went", async () => {
    await db.serviceBill.update({
      where: { id: bill },
      data: { scheduledFor: TODAY, scheduledCardId: arsCard },
    });
    await db.serviceBill.update({
      where: { id: strangerBill },
      data: { scheduledFor: TODAY, scheduledCardId: strangerCard },
    });

    expect(await processMyScheduledPayments()).toEqual({
      notice: "Pagamos 1 factura.",
    });
    expect((await billOf(bill)).status).toBe("PAID");
    expect((await billOf(strangerBill)).status).toBe("PENDING");
    expect(
      (await db.account.findUniqueOrThrow({ where: { id: arsAccount } })).balanceCents,
    ).toBe(BigInt(9_000_000));
    expect(revalidatePath).toHaveBeenCalledWith("/(app)", "layout");
  });

  it("reports failures and an empty run", async () => {
    expect(await processMyScheduledPayments()).toEqual({
      notice: "No había pagos para procesar hoy.",
    });

    await db.account.update({ where: { id: arsAccount }, data: { balanceCents: 0 } });
    await db.serviceBill.update({
      where: { id: bill },
      data: { scheduledFor: TODAY, scheduledCardId: arsCard },
    });
    expect(await processMyScheduledPayments()).toEqual({
      notice: "1 pago no se pudo hacer. Revisá el aviso en el servicio.",
    });
  });
});

describe("saveReminder", () => {
  it("sets the reminder days of the user's service, and turns it off", async () => {
    expect(await saveReminder(undefined, form({ adhesionId: adhesion, reminderDays: "3" }))).toEqual({
      notice: "Te vamos a avisar 3 días antes del vencimiento.",
    });
    expect(
      (await db.serviceAdhesion.findUniqueOrThrow({ where: { id: adhesion } })).reminderDays,
    ).toBe(3);
    expect(await saveReminder(undefined, form({ adhesionId: adhesion, reminderDays: "0" }))).toEqual({
      notice: "Te vamos a avisar el día del vencimiento.",
    });
    expect(await saveReminder(undefined, form({ adhesionId: adhesion, reminderDays: "" }))).toEqual({
      notice: "Recordatorios desactivados.",
    });
    expect(
      (await db.serviceAdhesion.findUniqueOrThrow({ where: { id: adhesion } })).reminderDays,
    ).toBeNull();
  });

  it("rejects another choice and another user's service", async () => {
    expect(await saveReminder(undefined, form({ adhesionId: adhesion, reminderDays: "5" }))).toEqual({
      error: "Elegí cuándo avisarte.",
    });
    expect(
      await saveReminder(undefined, form({ adhesionId: strangerAdhesion, reminderDays: "1" })),
    ).toEqual({ error: "Este servicio ya no está disponible." });
    expect(
      (await db.serviceAdhesion.findUniqueOrThrow({ where: { id: strangerAdhesion } })).reminderDays,
    ).toBeNull();
  });
});
