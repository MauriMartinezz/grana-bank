import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buenosAiresDate } from "@/features/services/due-date";
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

const { cancelSubscription, changeSubscriptionCard, subscribe } = await import("./actions");

const EMAILS = [
  "owner@subscriptions-actions.test",
  "stranger@subscriptions-actions.test",
  "nocard@subscriptions-actions.test",
];
const CARD = { brand: "VISA" as const, holder: "Test", expiry: "12/30" };

type TestUser = { id: string; pesoCards: string[]; dollarCard: string | null };
let owner: TestUser;
let stranger: TestUser;
let noCard: TestUser;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function createUser(
  email: string,
  alias: string,
  pesoLast4: string[],
  dollarLast4?: string,
): Promise<TestUser> {
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
            balanceCents: 0,
            cards: { create: pesoLast4.map((last4) => ({ ...CARD, last4 })) },
          },
          ...(dollarLast4
            ? [
                {
                  currency: "USD" as const,
                  alias: `${alias}.usd`,
                  balanceCents: 0,
                  cards: { create: [{ ...CARD, last4: dollarLast4 }] },
                },
              ]
            : []),
        ],
      },
    },
    include: {
      accounts: { include: { cards: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } } },
    },
  });
  const pesos = user.accounts.find((account) => account.currency === "ARS")!;
  const dollars = user.accounts.find((account) => account.currency === "USD");
  return {
    id: user.id,
    pesoCards: pesos.cards.map((card) => card.id),
    dollarCard: dollars?.cards[0]?.id ?? null,
  };
}

function subscriptionOf(userId: string, cardId: string | null, merchant = "Ritmo") {
  return db.subscription.create({
    data: { userId, merchant, amountCents: BigInt(249_900), cardId, billingDay: 5 },
  });
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0], "owner.subscriptionsactions", ["1111", "2222"], "3333");
  stranger = await createUser(EMAILS[1], "stranger.subscriptionsactions", ["4444"]);
  noCard = await createUser(EMAILS[2], "nocard.subscriptionsactions", []);
  current.user = { id: owner.id, name: "Owner" };
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("subscribe", () => {
  it("subscribes to a catalog service on the first peso card, billed on today's day", async () => {
    await expect(subscribe(undefined, form({ slug: "ritmo" }))).rejects.toThrow(
      /^REDIRECT:\/suscripciones\/[0-9a-f-]+$/,
    );
    const saved = await db.subscription.findMany({ where: { userId: owner.id } });
    expect(saved).toMatchObject([
      {
        merchant: "Ritmo",
        amountCents: BigInt(249_900),
        currency: "ARS",
        cardId: owner.pesoCards[0],
        billingDay: buenosAiresDate(new Date()).day,
        status: "ACTIVE",
        cancelledAt: null,
      },
    ]);
  });

  it("rejects an unknown service", async () => {
    expect(await subscribe(undefined, form({ slug: "nope" }))).toEqual({
      error: "Elegí un servicio de la lista.",
    });
    expect(await db.subscription.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("rejects a second active subscription to the same service", async () => {
    await subscriptionOf(owner.id, owner.pesoCards[0]);
    expect(await subscribe(undefined, form({ slug: "ritmo" }))).toEqual({
      error: "Ya tenés una suscripción activa a Ritmo.",
    });
    expect(await db.subscription.count({ where: { userId: owner.id } })).toBe(1);
  });

  it("allows subscribing again after cancelling", async () => {
    const old = await subscriptionOf(owner.id, owner.pesoCards[0]);
    await db.subscription.update({
      where: { id: old.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await expect(subscribe(undefined, form({ slug: "ritmo" }))).rejects.toThrow("REDIRECT:");
    expect(await db.subscription.count({ where: { userId: owner.id, status: "ACTIVE" } })).toBe(1);
  });

  it("needs a peso card", async () => {
    current.user = { id: noCard.id, name: "No card" };
    expect(await subscribe(undefined, form({ slug: "ritmo" }))).toEqual({
      error: "Necesitás una tarjeta en pesos para suscribirte. Agregala en Tarjetas.",
    });
    expect(await db.subscription.count({ where: { userId: noCard.id } })).toBe(0);
  });
});

describe("cancelSubscription", () => {
  it("cancels the owner's active subscription once and keeps the first date", async () => {
    const mine = await subscriptionOf(owner.id, owner.pesoCards[0]);

    await expect(cancelSubscription(form({ subscriptionId: mine.id }))).rejects.toThrow(
      `REDIRECT:/suscripciones/${mine.id}`,
    );
    const first = await db.subscription.findUniqueOrThrow({ where: { id: mine.id } });
    expect(first.status).toBe("CANCELLED");
    expect(first.cancelledAt).toBeInstanceOf(Date);

    await expect(cancelSubscription(form({ subscriptionId: mine.id }))).rejects.toThrow(
      `REDIRECT:/suscripciones/${mine.id}`,
    );
    const second = await db.subscription.findUniqueOrThrow({ where: { id: mine.id } });
    expect(second.cancelledAt).toEqual(first.cancelledAt);
  });

  it("never cancels another user's subscription", async () => {
    const theirs = await subscriptionOf(stranger.id, stranger.pesoCards[0]);
    await expect(cancelSubscription(form({ subscriptionId: theirs.id }))).rejects.toThrow(
      "REDIRECT:",
    );
    expect(await db.subscription.findUniqueOrThrow({ where: { id: theirs.id } })).toMatchObject({
      status: "ACTIVE",
      cancelledAt: null,
    });
  });
});

describe("changeSubscriptionCard", () => {
  it("moves the owner's subscription to another of their peso cards", async () => {
    const mine = await subscriptionOf(owner.id, owner.pesoCards[0]);
    expect(
      await changeSubscriptionCard(
        undefined,
        form({ subscriptionId: mine.id, cardId: owner.pesoCards[1] }),
      ),
    ).toEqual({ notice: "Listo, la cobraríamos en esta tarjeta. Es una demo: no se cobra." });
    expect((await db.subscription.findUniqueOrThrow({ where: { id: mine.id } })).cardId).toBe(
      owner.pesoCards[1],
    );
  });

  it("rejects a card in another currency or of another user", async () => {
    const mine = await subscriptionOf(owner.id, owner.pesoCards[0]);
    for (const cardId of [owner.dollarCard!, stranger.pesoCards[0]]) {
      expect(
        await changeSubscriptionCard(undefined, form({ subscriptionId: mine.id, cardId })),
      ).toEqual({ error: "Elegí una de tus tarjetas en pesos." });
    }
    expect((await db.subscription.findUniqueOrThrow({ where: { id: mine.id } })).cardId).toBe(
      owner.pesoCards[0],
    );
  });

  it("never changes another user's subscription", async () => {
    const theirs = await subscriptionOf(stranger.id, stranger.pesoCards[0]);
    expect(
      await changeSubscriptionCard(
        undefined,
        form({ subscriptionId: theirs.id, cardId: owner.pesoCards[0] }),
      ),
    ).toEqual({ error: "No encontramos la suscripción." });
    expect((await db.subscription.findUniqueOrThrow({ where: { id: theirs.id } })).cardId).toBe(
      stranger.pesoCards[0],
    );
  });

  it("never changes a cancelled subscription", async () => {
    const mine = await subscriptionOf(owner.id, owner.pesoCards[0]);
    await db.subscription.update({
      where: { id: mine.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    expect(
      await changeSubscriptionCard(
        undefined,
        form({ subscriptionId: mine.id, cardId: owner.pesoCards[1] }),
      ),
    ).toEqual({ error: "Esta suscripción está dada de baja." });
  });
});
