import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { NO_FILTERS } from "./filters";
import {
  getMovement,
  listCardMovements,
  listMovements,
  listRecentMovements,
  RECENT_MOVEMENTS,
} from "./queries";

const OWNER_EMAIL = "owner@queries.test";
const OTHER_EMAIL = "other@queries.test";

let ownerId: string;
let otherId: string;
let otherMovementId: string;

function createUser(email: string, reference: string, counterparty: string) {
  return db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      accounts: {
        create: {
          balanceCents: 0,
          alias: email.replace("@", "."),
          movements: {
            create: [
              {
                type: "SENT",
                counterparty,
                amountCents: 100,
                reference: `${reference}-1`,
                occurredAt: new Date("2026-01-01T00:00:00Z"),
              },
              {
                type: "SUBSCRIPTION",
                counterparty: "Adobe",
                amountCents: 200,
                reference: `${reference}-2`,
                occurredAt: new Date("2026-02-01T00:00:00Z"),
              },
            ],
          },
        },
      },
    },
    include: { accounts: { include: { movements: true } } },
  });
}

async function cleanUp() {
  await db.user.deleteMany({
    where: { email: { in: [OWNER_EMAIL, OTHER_EMAIL] } },
  });
}

beforeAll(async () => {
  await cleanUp();
  ownerId = (await createUser(OWNER_EMAIL, "TEST-OWNER", "Juan Perez")).id;
  const other = await createUser(OTHER_EMAIL, "TEST-OTHER", "Solo Otro");
  otherId = other.id;
  otherMovementId = other.accounts[0].movements[0].id;
});

afterAll(cleanUp);

describe("listMovements", () => {
  it("returns only the movements of the user, newest first", async () => {
    const movements = await listMovements(ownerId);
    expect(movements.map((m) => m.reference)).toEqual([
      "TEST-OWNER-2",
      "TEST-OWNER-1",
    ]);
  });

  it("searches by name ignoring case", async () => {
    const movements = await listMovements(ownerId, {
      query: "juan",
      type: null,
    });
    expect(movements.map((m) => m.counterparty)).toEqual(["Juan Perez"]);
  });

  it("treats wildcard characters as plain text", async () => {
    for (const query of ["%", "_"]) {
      const movements = await listMovements(ownerId, { query, type: null });
      expect(movements).toEqual([]);
    }
  });

  it("never finds names from another user", async () => {
    const movements = await listMovements(ownerId, {
      query: "Solo Otro",
      type: null,
    });
    expect(movements).toEqual([]);
  });

  it("filters by type", async () => {
    const movements = await listMovements(ownerId, {
      query: "",
      type: "SUBSCRIPTION",
    });
    expect(movements.map((m) => m.counterparty)).toEqual(["Adobe"]);
  });

  it("never returns another user's movements when filtering by currency", async () => {
    const movements = await listMovements(ownerId, NO_FILTERS, 50, "ARS");
    expect(movements.map((m) => m.reference)).not.toContain("TEST-OTHER-1");
    expect(movements.every((m) => m.reference?.startsWith("TEST-OWNER"))).toBe(true);
  });

  it("respects the limit", async () => {
    const movements = await listMovements(
      ownerId,
      { query: "", type: null },
      1,
    );
    expect(movements).toHaveLength(1);
  });
});

describe("listMovements with two accounts", () => {
  it("returns every account by default and only one currency when asked", async () => {
    const usd = await db.account.create({
      data: {
        userId: ownerId,
        currency: "USD",
        alias: "owner.queries.test.usd",
        balanceCents: 0,
        movements: {
          create: {
            type: "RECEIVED",
            counterparty: "Dolar Amigo",
            amountCents: 300,
            reference: "TEST-OWNER-USD-1",
            occurredAt: new Date("2026-03-01T00:00:00Z"),
          },
        },
      },
    });
    try {
      const movements = await listMovements(ownerId);
      expect(movements.map((m) => [m.reference, m.account.currency])).toEqual([
        ["TEST-OWNER-USD-1", "USD"],
        ["TEST-OWNER-2", "ARS"],
        ["TEST-OWNER-1", "ARS"],
      ]);

      const inUsd = await listMovements(ownerId, NO_FILTERS, 50, "USD");
      expect(inUsd.map((m) => m.reference)).toEqual(["TEST-OWNER-USD-1"]);

      const inArs = await listMovements(ownerId, NO_FILTERS, 50, "ARS");
      expect(inArs.map((m) => m.reference)).toEqual([
        "TEST-OWNER-2",
        "TEST-OWNER-1",
      ]);
    } finally {
      await db.account.delete({ where: { id: usd.id } });
    }
  });
});

describe("getMovement", () => {
  it("returns the movement to its owner", async () => {
    const movement = await getMovement(otherId, otherMovementId);
    expect(movement?.counterparty).toBe("Solo Otro");
  });

  it("does not expose a movement to another user", async () => {
    await expect(getMovement(ownerId, otherMovementId)).resolves.toBeNull();
  });

  it("returns null for an id that is not a valid identifier", async () => {
    await expect(getMovement(ownerId, "not-a-uuid")).resolves.toBeNull();
  });
});

describe("movement cards", () => {
  const EMAIL = "cards@queries.test";

  afterAll(() => db.user.deleteMany({ where: { email: EMAIL } }));

  it("returns only the brand and last 4 digits of the movement's card", async () => {
    await db.user.deleteMany({ where: { email: EMAIL } });
    const user = await db.user.create({
      data: {
        email: EMAIL,
        firstName: "Test",
        lastName: "",
        passwordHash: "!",
        accounts: {
          create: {
            currency: "ARS",
            alias: "cards.queries.test",
            balanceCents: 0,
            cards: {
              create: [{ brand: "VISA", last4: "8845", holder: "Test Holder", expiry: "12/30" }],
            },
          },
        },
      },
      include: { accounts: { include: { cards: true } } },
    });
    const [account] = user.accounts;
    const withCard = await db.movement.create({
      data: {
        accountId: account.id,
        cardId: account.cards[0].id,
        type: "SENT",
        counterparty: "Con Tarjeta",
        amountCents: 100,
        reference: "TEST-CARD-1",
        occurredAt: new Date("2026-01-02T00:00:00Z"),
      },
    });
    await db.movement.create({
      data: {
        accountId: account.id,
        type: "SENT",
        counterparty: "Sin Tarjeta",
        amountCents: 100,
        reference: "TEST-CARD-2",
        occurredAt: new Date("2026-01-01T00:00:00Z"),
      },
    });

    const movements = await listMovements(user.id);
    expect(movements.map((m) => m.card)).toEqual([{ last4: "8845", brand: "VISA" }, null]);

    const detail = await getMovement(user.id, withCard.id);
    expect(detail?.card).toEqual({ last4: "8845", brand: "VISA" });
  });
});

describe("listRecentMovements", () => {
  const EMAIL = "recent@queries.test";

  afterAll(() => db.user.deleteMany({ where: { email: EMAIL } }));

  it("returns the latest 6 movements across every account, newest first", async () => {
    await db.user.deleteMany({ where: { email: EMAIL } });
    const movement = (reference: string, day: number) => ({
      type: "RECEIVED" as const,
      counterparty: "Test",
      amountCents: 100,
      reference,
      occurredAt: new Date(Date.UTC(2026, 0, day)),
    });
    const user = await db.user.create({
      data: {
        email: EMAIL,
        firstName: "Test",
        lastName: "",
        passwordHash: "!",
        accounts: {
          create: [
            {
              currency: "ARS",
              alias: "recent.queries.test",
              balanceCents: 0,
              movements: {
                create: [1, 3, 5, 7].map((day) => movement(`ARS-${day}`, day)),
              },
            },
            {
              currency: "USD",
              alias: "recent.queries.test.usd",
              balanceCents: 0,
              movements: {
                create: [2, 4, 6, 8].map((day) => movement(`USD-${day}`, day)),
              },
            },
          ],
        },
      },
    });

    expect(RECENT_MOVEMENTS).toBe(6);
    const movements = await listRecentMovements(user.id);
    expect(movements.map((m) => [m.reference, m.account.currency])).toEqual([
      ["USD-8", "USD"],
      ["ARS-7", "ARS"],
      ["USD-6", "USD"],
      ["ARS-5", "ARS"],
      ["USD-4", "USD"],
      ["ARS-3", "ARS"],
    ]);
  });
});

describe("listCardMovements", () => {
  const EMAILS = ["cardowner@queries.test", "cardother@queries.test"];

  afterAll(() => db.user.deleteMany({ where: { email: { in: EMAILS } } }));

  function createCardUser(email: string) {
    return db.user.create({
      data: {
        email,
        firstName: "Test",
        lastName: "",
        passwordHash: "!",
        accounts: {
          create: {
            currency: "ARS",
            alias: email.replace("@", "."),
            balanceCents: 0,
            cards: {
              create: [
                { brand: "VISA", last4: "8845", holder: "Test Holder", expiry: "12/30" },
                { brand: "AMEX", last4: "0005", holder: "Test Holder", expiry: "12/30" },
              ],
            },
          },
        },
      },
      include: { accounts: { include: { cards: { orderBy: { last4: "desc" } } } } },
    });
  }

  function movement(accountId: string, cardId: string | null, reference: string, day: number) {
    return db.movement.create({
      data: {
        accountId,
        cardId,
        type: "SENT",
        counterparty: reference,
        amountCents: 100,
        reference,
        occurredAt: new Date(Date.UTC(2026, 0, day)),
      },
    });
  }

  it("returns only that card's movements, newest first, with the card face", async () => {
    await db.user.deleteMany({ where: { email: { in: EMAILS } } });
    const owner = await createCardUser(EMAILS[0]);
    const [account] = owner.accounts;
    const [visa, amex] = account.cards;
    await movement(account.id, visa.id, "VISA-1", 1);
    await movement(account.id, visa.id, "VISA-3", 3);
    await movement(account.id, amex.id, "AMEX-2", 2);
    await movement(account.id, null, "NONE-4", 4);

    const movements = await listCardMovements(owner.id, visa.id);
    expect(movements.map((m) => m.reference)).toEqual(["VISA-3", "VISA-1"]);
    expect(movements[0].card).toEqual({ last4: "8845", brand: "VISA" });
    expect(movements[0].account).toEqual({ currency: "ARS" });

    expect(await listCardMovements(owner.id, visa.id, 1)).toHaveLength(1);
  });

  it("never returns another user's movements, even with a valid card id", async () => {
    const other = await createCardUser(EMAILS[1]);
    const [account] = other.accounts;
    await movement(account.id, account.cards[0].id, "OTHER-1", 5);
    const owner = await db.user.findUniqueOrThrow({ where: { email: EMAILS[0] } });

    await expect(listCardMovements(owner.id, account.cards[0].id)).resolves.toEqual([]);
    const own = await listCardMovements(other.id, account.cards[0].id);
    expect(own.map((m) => m.reference)).toEqual(["OTHER-1"]);
  });
});
