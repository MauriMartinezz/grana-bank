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

const { confirmTopUp, reviewTopUp } = await import("./actions");
const { confirmationPath, readTopUpConfirmation } = await import("./confirmation");
const { topUp } = await import("./top-up");
const { getMovement } = await import("@/features/movements/queries");

const EMAIL = "rider@top-up-notes.test";
const CARD = { brand: "VISA" as const, holder: "Rider", expiry: "12/30" };
const TOO_LONG = "a".repeat(141);
const KEY = "0b7c3a52-5a0e-4c8e-9c39-2a6f1a7d9e10";
const SUBE_ID = "4f7d2c1e-0000-4000-8000-000000000001";
const CARD_ID = "4f7d2c1e-0000-4000-8000-000000000002";

let account: string;
let card: string;
let sube: string;

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
  const rider = await db.user.create({
    data: {
      email: EMAIL,
      firstName: "Rider",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: {
          currency: "ARS",
          alias: "rider.topupnotes",
          balanceCents: 500_000,
          cards: { create: [{ ...CARD, last4: "1111" }] },
        },
      },
      subeCards: { create: { number: "6061234567890123", nickname: "sube de mauri" } },
    },
    include: { accounts: { include: { cards: true } }, subeCards: true },
  });
  current.user = { id: rider.id, name: "Rider" };
  account = rider.accounts[0].id;
  card = rider.accounts[0].cards[0].id;
  sube = rider.subeCards[0].id;
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
});

describe("top-up confirmation URL", () => {
  const base = {
    kind: "SUBE",
    provider: "SUBE",
    target: SUBE_ID,
    amount: "150000",
    card: CARD_ID,
    key: KEY,
  };

  it("carries the note after the key, and no note param without one", () => {
    const draft = {
      kind: "SUBE" as const,
      provider: "SUBE" as const,
      target: SUBE_ID,
      amountCents: 150000,
      cardId: CARD_ID,
    };
    const plain = `/recargas/confirmar?kind=SUBE&provider=SUBE&target=${SUBE_ID}&amount=150000&card=${CARD_ID}&key=${KEY}`;
    expect(confirmationPath(draft, KEY)).toBe(plain);
    expect(confirmationPath({ ...draft, note: null }, KEY)).toBe(plain);
    expect(confirmationPath({ ...draft, note: "viaje & vuelta" }, KEY)).toBe(
      `${plain}&note=viaje+%26+vuelta`,
    );
  });

  it("reads the note back from the URL", () => {
    expect(readTopUpConfirmation({ ...base, note: "  viaje\r\nida " })).toEqual({
      kind: "SUBE",
      provider: "SUBE",
      target: SUBE_ID,
      amountCents: 150000,
      cardId: CARD_ID,
      note: "viaje\nida",
      idempotencyKey: KEY,
    });
  });

  it("keeps the note when it adds a missing key", () => {
    expect(readTopUpConfirmation({ ...base, key: undefined, note: "viaje" }, () => KEY)).toEqual({
      redirectTo: `/recargas/confirmar?kind=SUBE&provider=SUBE&target=${SUBE_ID}&amount=150000&card=${CARD_ID}&key=${KEY}&note=viaje`,
    });
  });

  it("sends a note over 140 characters or a repeated note back to the form", () => {
    expect(readTopUpConfirmation({ ...base, note: TOO_LONG })).toEqual({
      redirectTo: `/recargas/sube/${SUBE_ID}`,
    });
    expect(readTopUpConfirmation({ ...base, note: ["a", "b"] })).toEqual({
      redirectTo: `/recargas/sube/${SUBE_ID}`,
    });
  });
});

describe("reviewTopUp with a note", () => {
  const review = (fields: Record<string, string> = {}) =>
    reviewTopUp(
      undefined,
      form({ kind: "SUBE", provider: "SUBE", target: sube, amount: "1.500", cardId: card, ...fields }),
    );

  it("carries the trimmed note to the confirmation", async () => {
    expect(await message(review({ note: "  para el viaje  " }))).toMatch(
      new RegExp(`&key=[0-9a-f-]{36}&note=para\\+el\\+viaje$`),
    );
  });

  it("keeps the previous URL without a note or with a blank one", async () => {
    const pattern = new RegExp(
      `^REDIRECT:/recargas/confirmar\\?kind=SUBE&provider=SUBE&target=${sube}&amount=150000&card=${card}&key=[0-9a-f-]{36}$`,
    );
    expect(await message(review())).toMatch(pattern);
    expect(await message(review({ note: "   " }))).toMatch(pattern);
  });

  it("rejects a note over 140 characters", async () => {
    expect(await review({ note: TOO_LONG })).toEqual({
      error: "La nota tiene hasta 140 caracteres.",
    });
    expect(await message(review({ note: "a".repeat(140) }))).toMatch(/^REDIRECT:/);
  });
});

describe("confirmTopUp with a note", () => {
  const confirm = (fields: Record<string, string> = {}) =>
    confirmTopUp(
      undefined,
      form({
        kind: "SUBE",
        provider: "SUBE",
        target: sube,
        amountCents: "10000",
        cardId: card,
        idempotencyKey: randomUUID(),
        ...fields,
      }),
    );

  it("saves the note and shows it on the movement detail", async () => {
    const result = (await message(confirm({ note: " carga\r\nmensual " }))) as string;
    const movementId = result.replace("REDIRECT:/recargas/comprobante/", "");

    const saved = await db.topUp.findFirstOrThrow({ where: { userId: current.user.id } });
    expect(saved.note).toBe("carga\nmensual");
    const movement = await getMovement(current.user.id, movementId);
    expect(movement?.topUp?.note).toBe("carga\nmensual");
  });

  it("keeps the previous result without a note: same receipt, no note saved", async () => {
    await expect(confirm()).rejects.toThrow(/^REDIRECT:\/recargas\/comprobante\/[0-9a-f-]{36}$/);
    const saved = await db.topUp.findFirstOrThrow({ where: { userId: current.user.id } });
    expect(saved.note).toBeNull();
    expect(await balance()).toBe(BigInt(490_000));
  });

  it("rejects a note over 140 characters and moves no money", async () => {
    expect(await confirm({ note: TOO_LONG })).toEqual({
      error: "La nota tiene hasta 140 caracteres.",
    });
    expect(await balance()).toBe(BigInt(500_000));
  });

  it("returns the first result on a replay with another note", async () => {
    const key = randomUUID();
    const first = await message(confirm({ idempotencyKey: key, note: "primera" }));
    const second = await message(confirm({ idempotencyKey: key, note: "otra" }));

    expect(second).toBe(first);
    const saved = await db.topUp.findMany({ where: { userId: current.user.id } });
    expect(saved.map((row) => row.note)).toEqual(["primera"]);
    expect(await balance()).toBe(BigInt(490_000));
  });
});

describe("topUp with a note", () => {
  const request = (note?: string | null) =>
    topUp({
      userId: current.user.id,
      kind: "SUBE",
      provider: "SUBE",
      target: sube,
      amountCents: 10000,
      cardId: card,
      idempotencyKey: randomUUID(),
      note,
    });

  it("rejects a note over 140 characters", async () => {
    expect(await request(TOO_LONG)).toEqual({ ok: false, error: "INVALID_NOTE" });
    expect(await db.topUp.count({ where: { userId: current.user.id } })).toBe(0);
  });

  it("saves an empty note as none", async () => {
    expect(await request("  ")).toMatchObject({ ok: true });
    expect((await db.topUp.findFirstOrThrow({ where: { userId: current.user.id } })).note).toBeNull();
  });
});
