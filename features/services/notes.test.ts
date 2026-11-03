import { randomUUID } from "node:crypto";
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

const { confirmBillPayment, reviewBillPayment } = await import("./actions");
const { adhereService: createAdhesion } = await import("./adhesions");
const { confirmationPath, readBillConfirmation } = await import("./confirmation");
const { payBill } = await import("./pay-bill");
const { getMovement } = await import("@/features/movements/queries");

const EMAIL = "owner@service-notes.test";
const CARD = { brand: "VISA" as const, holder: "Owner", expiry: "12/30" };
const TOO_LONG = "a".repeat(141);
const KEY = "0b7c3a52-5a0e-4c8e-9c39-2a6f1a7d9e10";
const NEW_KEY = "11111111-2222-4333-8444-555555555555";
const BILL_ID = "4f7d2c1e-0000-4000-8000-000000000001";
const CARD_ID = "4f7d2c1e-0000-4000-8000-000000000002";

let account: string;
let card: string;
let bill: { id: string; amountCents: bigint };

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

async function balance() {
  return (await db.account.findUniqueOrThrow({ where: { id: account } })).balanceCents;
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  const owner = await db.user.create({
    data: {
      email: EMAIL,
      firstName: "Owner",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: {
          currency: "ARS",
          alias: "owner.servicenotes",
          balanceCents: 10_000_000,
          cards: { create: [{ ...CARD, last4: "1111" }] },
        },
      },
    },
    include: { accounts: { include: { cards: true } } },
  });
  current.user = { id: owner.id, name: "Owner" };
  account = owner.accounts[0].id;
  card = owner.accounts[0].cards[0].id;
  await createAdhesion(owner.id, {
    company: "AYSA",
    paymentNumber: "0012345678",
    nickname: "Agua casa",
  });
  bill = await db.serviceBill.findFirstOrThrow({
    where: { adhesion: { userId: owner.id } },
    orderBy: { dueDate: "desc" },
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
});

describe("bill confirmation URL", () => {
  const read = (params: Record<string, string | string[] | undefined>) =>
    readBillConfirmation(
      { bill: params.bill, card: params.card, key: params.key, note: params.note },
      () => NEW_KEY,
    );

  it("carries the note after the key, and no note param without one", () => {
    const plain = `/servicios/confirmar?bill=${BILL_ID}&card=${CARD_ID}&key=${KEY}`;
    expect(confirmationPath({ billId: BILL_ID, cardId: CARD_ID }, KEY)).toBe(plain);
    expect(confirmationPath({ billId: BILL_ID, cardId: CARD_ID, note: null }, KEY)).toBe(plain);
    expect(confirmationPath({ billId: BILL_ID, cardId: CARD_ID, note: "luz & gas" }, KEY)).toBe(
      `${plain}&note=luz+%26+gas`,
    );
  });

  it("reads the note back from the URL", () => {
    expect(read({ bill: BILL_ID, card: CARD_ID, key: KEY, note: " depto\r\ncentro " })).toEqual({
      billId: BILL_ID,
      cardId: CARD_ID,
      note: "depto\ncentro",
      idempotencyKey: KEY,
    });
  });

  it("keeps the note when it adds a missing key", () => {
    expect(read({ bill: BILL_ID, card: CARD_ID, note: "depto" })).toEqual({
      redirectTo: `/servicios/confirmar?bill=${BILL_ID}&card=${CARD_ID}&key=${NEW_KEY}&note=depto`,
    });
  });

  it("sends a note over 140 characters or a repeated note back to the bill", () => {
    expect(read({ bill: BILL_ID, card: CARD_ID, key: KEY, note: TOO_LONG })).toEqual({
      redirectTo: `/servicios/pagar/${BILL_ID}`,
    });
    expect(read({ bill: BILL_ID, card: CARD_ID, key: KEY, note: ["a", "b"] })).toEqual({
      redirectTo: `/servicios/pagar/${BILL_ID}`,
    });
  });
});

describe("reviewBillPayment with a note", () => {
  const review = (fields: Record<string, string> = {}) =>
    reviewBillPayment(undefined, form({ billId: bill.id, cardId: card, ...fields }));

  it("carries the trimmed note to the confirmation", async () => {
    expect(await message(review({ note: "  luz del depto " }))).toMatch(
      new RegExp(`&key=[0-9a-f-]{36}&note=luz\\+del\\+depto$`),
    );
  });

  it("keeps the previous URL without a note or with a blank one", async () => {
    const pattern = new RegExp(
      `^REDIRECT:/servicios/confirmar\\?bill=${bill.id}&card=${card}&key=[0-9a-f-]{36}$`,
    );
    expect(await message(review())).toMatch(pattern);
    expect(await message(review({ note: " \r\n " }))).toMatch(pattern);
  });

  it("rejects a note over 140 characters", async () => {
    expect(await review({ note: TOO_LONG })).toEqual({
      error: "La nota tiene hasta 140 caracteres.",
    });
  });
});

describe("confirmBillPayment with a note", () => {
  const confirm = (fields: Record<string, string> = {}) =>
    confirmBillPayment(
      undefined,
      form({ billId: bill.id, cardId: card, idempotencyKey: randomUUID(), ...fields }),
    );

  it("saves the note and shows it on the movement detail", async () => {
    const result = (await message(confirm({ note: " agua\r\nnoviembre " }))) as string;
    const movementId = result.replace("REDIRECT:/servicios/comprobante/", "");

    const saved = await db.servicePayment.findFirstOrThrow({ where: { userId: current.user.id } });
    expect(saved.note).toBe("agua\nnoviembre");
    const movement = await getMovement(current.user.id, movementId);
    expect(movement?.servicePayment?.note).toBe("agua\nnoviembre");
  });

  it("keeps the previous result without a note: same receipt, no note saved", async () => {
    await expect(confirm()).rejects.toThrow(/^REDIRECT:\/servicios\/comprobante\/[0-9a-f-]{36}$/);
    const saved = await db.servicePayment.findFirstOrThrow({ where: { userId: current.user.id } });
    expect(saved.note).toBeNull();
    expect(await balance()).toBe(BigInt(10_000_000) - bill.amountCents);
  });

  it("rejects a note over 140 characters and moves no money", async () => {
    expect(await confirm({ note: TOO_LONG })).toEqual({
      error: "La nota tiene hasta 140 caracteres.",
    });
    expect(await balance()).toBe(BigInt(10_000_000));
  });

  it("returns the first result on a replay with another note", async () => {
    const key = randomUUID();
    const first = await message(confirm({ idempotencyKey: key, note: "primera" }));
    const second = await message(confirm({ idempotencyKey: key, note: "otra" }));

    expect(second).toBe(first);
    const saved = await db.servicePayment.findMany({ where: { userId: current.user.id } });
    expect(saved.map((row) => row.note)).toEqual(["primera"]);
    expect(await balance()).toBe(BigInt(10_000_000) - bill.amountCents);
  });
});

describe("payBill with a note", () => {
  it("rejects a note over 140 characters", async () => {
    expect(
      await payBill({
        userId: current.user.id,
        billId: bill.id,
        cardId: card,
        idempotencyKey: randomUUID(),
        note: TOO_LONG,
      }),
    ).toEqual({ ok: false, error: "INVALID_NOTE" });
    expect(await db.servicePayment.count({ where: { userId: current.user.id } })).toBe(0);
  });
});
