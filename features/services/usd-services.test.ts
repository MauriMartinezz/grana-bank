import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { defaultCategoryRows } from "@/features/categories/names";
import { db } from "@/lib/db";
import { adhereService } from "./adhesions";
import { payBill } from "./pay-bill";

const EMAIL = "payer@usd-services.test";
const NOW = new Date("2026-11-03T15:00:00Z");
const CARD = { brand: "VISA" as const, holder: "Test", expiry: "12/30" };

let user: { id: string; arsCard: string; usdCard: string; usdAccount: string; servicios: string };

async function billOf(company: "SALUD_PLENA" | "EDESUR", paymentNumber: string) {
  const adhered = await adhereService(user.id, { company, paymentNumber, nickname: "Prueba" }, NOW);
  if (!adhered.ok) throw new Error(adhered.error);
  return db.serviceBill.findFirstOrThrow({
    where: { adhesionId: adhered.adhesionId },
    orderBy: { dueDate: "desc" },
  });
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  const created = await db.user.create({
    data: {
      email: EMAIL,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      categories: { create: defaultCategoryRows() },
      accounts: {
        create: [
          {
            currency: "ARS",
            alias: "payer.usdservices",
            balanceCents: 100_000_000,
            cards: { create: [{ ...CARD, last4: "1111" }] },
          },
          {
            currency: "USD",
            alias: "payer.usdservices.usd",
            balanceCents: 100_000,
            cards: { create: [{ ...CARD, last4: "2222" }] },
          },
        ],
      },
    },
    include: { categories: true, accounts: { include: { cards: true } } },
  });
  const ars = created.accounts.find((a) => a.currency === "ARS")!;
  const usd = created.accounts.find((a) => a.currency === "USD")!;
  user = {
    id: created.id,
    arsCard: ars.cards[0].id,
    usdCard: usd.cards[0].id,
    usdAccount: usd.id,
    servicios: created.categories.find((c) => c.key === "servicios")!.id,
  };
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
});

describe("dollar services", () => {
  it("adheres a dollar company with USD bills", async () => {
    const bill = await billOf("SALUD_PLENA", "12345678");
    expect(bill.currency).toBe("USD");
  });

  it("pays a USD bill only from a dollar card", async () => {
    const bill = await billOf("SALUD_PLENA", "12345678");

    expect(
      await payBill({
        userId: user.id,
        billId: bill.id,
        cardId: user.arsCard,
        idempotencyKey: randomUUID(),
      }),
    ).toEqual({ ok: false, error: "CURRENCY_MISMATCH" });

    const paid = await payBill({
      userId: user.id,
      billId: bill.id,
      cardId: user.usdCard,
      idempotencyKey: randomUUID(),
    });
    expect(paid.ok).toBe(true);
    const account = await db.account.findUniqueOrThrow({ where: { id: user.usdAccount } });
    expect(account.balanceCents).toBe(BigInt(100_000) - bill.amountCents);
  });

  it("rejects a dollar company number of the wrong length in the database", async () => {
    await expect(
      db.serviceAdhesion.create({
        data: { userId: user.id, company: "AUSTRAL_SEGUROS", paymentNumber: "12345678", nickname: "x" },
      }),
    ).rejects.toThrow();
    await expect(
      db.serviceAdhesion.create({
        data: { userId: user.id, company: "SALUD_PLENA", paymentNumber: "123456789", nickname: "x" },
      }),
    ).rejects.toThrow();
  });
});

describe("the Servicios category", () => {
  it("files every service payment, pesos or dollars, under Servicios", async () => {
    for (const [company, number, card] of [
      ["EDESUR", "0012345678", () => user.arsCard],
      ["SALUD_PLENA", "12345678", () => user.usdCard],
    ] as const) {
      const bill = await billOf(company, number);
      const paid = await payBill({
        userId: user.id,
        billId: bill.id,
        cardId: card(),
        idempotencyKey: randomUUID(),
      });
      if (!paid.ok) throw new Error(paid.error);
      const movement = await db.movement.findUniqueOrThrow({ where: { id: paid.movementId } });
      expect(movement.categoryId).toBe(user.servicios);
    }
  });

  it("leaves the payment uncategorized when the user has no Servicios category", async () => {
    await db.category.delete({ where: { id: user.servicios } });
    const bill = await billOf("EDESUR", "0012345678");

    const paid = await payBill({
      userId: user.id,
      billId: bill.id,
      cardId: user.arsCard,
      idempotencyKey: randomUUID(),
    });

    if (!paid.ok) throw new Error(paid.error);
    const movement = await db.movement.findUniqueOrThrow({ where: { id: paid.movementId } });
    expect(movement.categoryId).toBeNull();
  });
});
