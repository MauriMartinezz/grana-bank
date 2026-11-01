import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getMovement, listMovements } from "./queries";

const OWNER_EMAIL = "owner@queries.test";
const OTHER_EMAIL = "other@queries.test";

let ownerId: string;
let otherId: string;
let otherMovementId: string;

function createUser(email: string, reference: string, counterparty: string) {
  return db.user.create({
    data: {
      email,
      name: "Test",
      passwordHash: "!",
      account: {
        create: {
          balanceCents: 0,
          cardBrand: "VISA",
          cardLast4: "0000",
          cardHolder: "Test",
          cardExpiry: "01/30",
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
    include: { account: { include: { movements: true } } },
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
  otherMovementId = other.account!.movements[0].id;
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

  it("respects the limit", async () => {
    const movements = await listMovements(
      ownerId,
      { query: "", type: null },
      1,
    );
    expect(movements).toHaveLength(1);
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
