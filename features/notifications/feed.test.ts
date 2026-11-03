import { describe, expect, it } from "vitest";
import { buildFeed, reminderDate, type FeedSources } from "./feed";

const NOW = new Date("2026-11-10T15:00:00Z");
const empty: FeedSources = { movements: [], exchanges: [], failedBills: [], reminderBills: [] };

function movement(type: string, at: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `m-${type}-${at}`,
    type: type as "RECEIVED",
    counterparty: "Juan Perez",
    amountCents: BigInt(150_000),
    currency: "ARS" as const,
    occurredAt: new Date(at),
    ...overrides,
  };
}

describe("buildFeed", () => {
  it("words every movement type and links to its detail", () => {
    const feed = buildFeed(
      {
        ...empty,
        movements: [
          movement("RECEIVED", "2026-11-10T12:00:00Z"),
          movement("SENT", "2026-11-10T11:00:00Z", { counterparty: "Martin Bozzini" }),
          movement("TOP_UP", "2026-11-10T10:00:00Z", { counterparty: "Carga SUBE" }),
          movement("SERVICE_PAYMENT", "2026-11-10T09:00:00Z", { counterparty: "Pago Edesur · Luz" }),
          movement("SUBSCRIPTION", "2026-11-10T08:00:00Z", { counterparty: "Netflix" }),
        ],
      },
      null,
      NOW,
    );

    expect(feed.map(({ title, detail, href }) => ({ title, detail, href }))).toEqual([
      { title: "Recibiste $1.500", detail: "De Juan Perez", href: "/movimientos/m-RECEIVED-2026-11-10T12:00:00Z" },
      { title: "Enviaste $1.500", detail: "A Martin Bozzini", href: "/movimientos/m-SENT-2026-11-10T11:00:00Z" },
      { title: "Recargaste $1.500", detail: "Carga SUBE", href: "/movimientos/m-TOP_UP-2026-11-10T10:00:00Z" },
      { title: "Pagaste $1.500", detail: "Pago Edesur · Luz", href: "/movimientos/m-SERVICE_PAYMENT-2026-11-10T09:00:00Z" },
      { title: "Se cobró $1.500", detail: "Suscripción a Netflix", href: "/movimientos/m-SUBSCRIPTION-2026-11-10T08:00:00Z" },
    ]);
  });

  it("words dollar buys and sells, failed payments and reminders", () => {
    const feed = buildFeed(
      {
        movements: [],
        exchanges: [
          {
            id: "e1",
            direction: "BUY",
            usdCents: BigInt(10_000),
            arsCents: BigInt(15_000_000),
            createdAt: new Date("2026-11-10T12:00:00Z"),
            movementId: "m-usd",
          },
          {
            id: "e2",
            direction: "SELL",
            usdCents: BigInt(5_000),
            arsCents: BigInt(7_500_000),
            createdAt: new Date("2026-11-10T11:00:00Z"),
            movementId: null,
          },
        ],
        failedBills: [
          {
            id: "b1",
            nickname: "Luz depto",
            period: "Noviembre 2026",
            failureReason: "INSUFFICIENT_FUNDS",
            failedAt: new Date("2026-11-10T10:00:00Z"),
          },
        ],
        reminderBills: [
          {
            id: "b2",
            nickname: "Agua",
            period: "Noviembre 2026",
            amountCents: BigInt(2_000_000),
            currency: "ARS",
            dueDate: new Date("2026-11-13T00:00:00Z"),
            reminderDays: 3,
          },
        ],
      },
      null,
      NOW,
    );

    expect(feed.map(({ title, detail, href }) => ({ title, detail, href }))).toEqual([
      { title: "Compraste USD$100", detail: "Por $150.000", href: "/movimientos/m-usd" },
      { title: "Vendiste USD$50", detail: "Por $75.000", href: "/dolares" },
      {
        title: "No pudimos pagar Luz depto",
        detail: "Noviembre 2026: no había saldo suficiente",
        href: "/servicios/pagar/b1",
      },
      { title: "Agua vence en 3 días", detail: "$20.000 · Noviembre 2026", href: "/servicios/pagar/b2" },
    ]);
  });

  it("marks as unread what came after the last visit, and keeps the newest 50", () => {
    const movements = Array.from({ length: 60 }, (_, index) =>
      movement("RECEIVED", new Date(Date.UTC(2026, 10, 10, 0, index)).toISOString()),
    );

    const feed = buildFeed({ ...empty, movements }, new Date("2026-11-10T00:55:00Z"), NOW);

    expect(feed).toHaveLength(50);
    expect(feed[0].at).toEqual(new Date("2026-11-10T00:59:00Z"));
    expect(feed.filter((item) => item.unread)).toHaveLength(4);
  });

  it("drops reminders that have not started or whose bill is past due", () => {
    const bill = {
      id: "b",
      nickname: "Gas",
      period: "Noviembre 2026",
      amountCents: BigInt(100),
      currency: "ARS" as const,
      reminderDays: 1,
    };
    const feed = buildFeed(
      {
        ...empty,
        reminderBills: [
          { ...bill, id: "later", dueDate: new Date("2026-11-12T00:00:00Z") },
          { ...bill, id: "today", dueDate: new Date("2026-11-11T00:00:00Z") },
          { ...bill, id: "past", dueDate: new Date("2026-11-09T00:00:00Z") },
        ],
      },
      null,
      NOW,
    );

    expect(feed.map((item) => item.id)).toEqual(["reminder-today"]);
    expect(feed[0].title).toBe("Gas vence mañana");
  });
});

describe("reminderDate", () => {
  it("is midnight in Buenos Aires of the day the reminder starts", () => {
    expect(reminderDate(new Date("2026-11-13T00:00:00Z"), 3)).toEqual(
      new Date("2026-11-10T03:00:00Z"),
    );
  });
});
