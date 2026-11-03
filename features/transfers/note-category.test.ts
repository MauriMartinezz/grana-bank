import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultCategoryRows } from "@/features/categories/names";
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

const { confirmTransfer, reviewAmount } = await import("./actions");
const { readTransferExtras } = await import("./confirmation");
const { transfer } = await import("./transfer");

const EMAILS = ["sender@note-category.test", "recipient@note-category.test"];

let sender: { id: string; account: string; rent: string };
let recipient: { id: string; account: string; rent: string };

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

async function createUser(email: string, alias: string, balanceCents: number) {
  const user = await db.user.create({
    data: {
      email,
      firstName: alias,
      lastName: "",
      passwordHash: "!",
      categories: { create: defaultCategoryRows() },
      accounts: { create: { balanceCents, alias } },
    },
    include: { accounts: true, categories: true },
  });
  return {
    id: user.id,
    account: user.accounts[0].id,
    rent: user.categories.find((category) => category.name === "Alquiler")!.id,
  };
}

function movementsOf(accountId: string) {
  return db.movement.findMany({ where: { accountId }, include: { transfer: true } });
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  sender = await createUser(EMAILS[0], "sender.notecategory", 10_000);
  recipient = await createUser(EMAILS[1], "recipient.notecategory", 0);
  current.user = { id: sender.id, name: "Sender" };
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("transfer with a note and a category", () => {
  it("shows the note on both sides and keeps the category on the sender's side only", async () => {
    const result = await transfer({
      senderId: sender.id,
      recipientAccountId: recipient.account,
      amountCents: 1_000,
      idempotencyKey: randomUUID(),
      note: "Alquiler de noviembre",
      categoryId: sender.rent,
    });

    expect(result.ok).toBe(true);
    const [sent] = await movementsOf(sender.account);
    const [received] = await movementsOf(recipient.account);
    expect(sent.transfer?.note).toBe("Alquiler de noviembre");
    expect(received.transfer?.note).toBe("Alquiler de noviembre");
    expect(sent.categoryId).toBe(sender.rent);
    expect(received.categoryId).toBeNull();
  });

  it("transfers without a note or a category, as before", async () => {
    const result = await transfer({
      senderId: sender.id,
      recipientAccountId: recipient.account,
      amountCents: 1_000,
      idempotencyKey: randomUUID(),
    });

    expect(result.ok).toBe(true);
    const [sent] = await movementsOf(sender.account);
    expect(sent.transfer?.note).toBeNull();
    expect(sent.categoryId).toBeNull();
  });

  it("rejects another user's category or a note over 140 characters and moves no money", async () => {
    const base = {
      senderId: sender.id,
      recipientAccountId: recipient.account,
      amountCents: 1_000,
    };

    expect(
      await transfer({ ...base, idempotencyKey: randomUUID(), categoryId: recipient.rent }),
    ).toEqual({ ok: false, error: "CATEGORY_NOT_FOUND" });
    expect(
      await transfer({ ...base, idempotencyKey: randomUUID(), note: "x".repeat(141) }),
    ).toEqual({ ok: false, error: "INVALID_NOTE" });
    expect(await movementsOf(sender.account)).toHaveLength(0);
    expect(
      (await db.account.findUniqueOrThrow({ where: { id: sender.account } })).balanceCents,
    ).toBe(BigInt(10_000));
  });
});

describe("reviewAmount with a note and a category", () => {
  it("carries the note and the category to the confirmation", async () => {
    const result = (await message(
      reviewAmount(
        undefined,
        form({
          recipientAccountId: recipient.account,
          amount: "10",
          note: "  Alquiler & expensas ",
          categoryId: sender.rent,
        }),
      ),
    )) as string;

    const url = new URL(result.replace(/^REDIRECT:/, ""), "http://localhost");
    expect(url.pathname).toBe(`/transferir/${recipient.account}/confirmar`);
    expect(url.searchParams.get("amount")).toBe("1000");
    expect(url.searchParams.get("note")).toBe("Alquiler & expensas");
    expect(url.searchParams.get("category")).toBe(sender.rent);
  });

  it("rejects a long note or another user's category, saying which field", async () => {
    expect(
      await reviewAmount(
        undefined,
        form({ recipientAccountId: recipient.account, amount: "10", note: "x".repeat(141) }),
      ),
    ).toEqual({ value: "10", error: "La nota tiene hasta 140 caracteres.", field: "note" });
    expect(
      await reviewAmount(
        undefined,
        form({ recipientAccountId: recipient.account, amount: "10", categoryId: recipient.rent }),
      ),
    ).toEqual({ value: "10", error: "Esta categoría ya no está disponible.", field: "category" });
  });
});

describe("readTransferExtras", () => {
  it("reads a note and a category id, and nothing when they are absent", () => {
    const id = "6f1c2b7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
    expect(readTransferExtras("Pago", id)).toEqual({ note: "Pago", categoryId: id });
    expect(readTransferExtras(undefined, undefined)).toEqual({ note: null, categoryId: null });
    expect(readTransferExtras("", "")).toEqual({ note: null, categoryId: null });
  });

  it("rejects a note over 140 characters, a malformed id or repeated params", () => {
    expect(readTransferExtras("x".repeat(141), undefined)).toBeNull();
    expect(readTransferExtras(undefined, "not-an-id")).toBeNull();
    expect(readTransferExtras(["a", "b"], undefined)).toBeNull();
  });
});

describe("confirmTransfer with a note and a category", () => {
  it("transfers with them", async () => {
    await expect(
      confirmTransfer(
        undefined,
        form({
          recipientAccountId: recipient.account,
          amountCents: "1000",
          idempotencyKey: randomUUID(),
          note: "Regalo",
          categoryId: sender.rent,
        }),
      ),
    ).rejects.toThrow(/^REDIRECT:\/transferir\/comprobante\//);

    const [sent] = await movementsOf(sender.account);
    expect(sent.transfer?.note).toBe("Regalo");
    expect(sent.categoryId).toBe(sender.rent);
  });

  it("explains another user's category", async () => {
    expect(
      await confirmTransfer(
        undefined,
        form({
          recipientAccountId: recipient.account,
          amountCents: "1000",
          idempotencyKey: randomUUID(),
          categoryId: recipient.rent,
        }),
      ),
    ).toEqual({ error: "Esta categoría ya no está disponible. Volvé a elegirla." });
  });
});
