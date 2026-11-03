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

const { createTopUpSchedule, deleteTopUpSchedule } = await import("./schedule-actions");
const { listTopUpSchedules } = await import("./schedule-queries");

const EMAILS = ["owner@topup-schedules.test", "stranger@topup-schedules.test"];
let owner: { id: string; sube: string };
let stranger: { id: string; sube: string };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function createUser(email: string, alias: string, number: string) {
  const user = await db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      accounts: { create: { currency: "ARS", alias, balanceCents: 0 } },
      subeCards: { create: { number, nickname: "sube" } },
    },
    include: { subeCards: true },
  });
  return { id: user.id, sube: user.subeCards[0].id };
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0], "owner.topupschedules", "6061000000000001");
  stranger = await createUser(EMAILS[1], "stranger.topupschedules", "6061000000000002");
  current.user = { id: owner.id, name: "Owner" };
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("createTopUpSchedule", () => {
  it("saves a monthly SUBE top-up and says it is a demo", async () => {
    expect(
      await createTopUpSchedule(
        undefined,
        form({ subeCardId: owner.sube, amount: "10.000", frequency: "MONTHLY", day: "1" }),
      ),
    ).toEqual({ notice: "Programamos $10.000 el día 1 de cada mes. Es una demo: no se carga saldo." });
    expect(await listTopUpSchedules(owner.id, owner.sube)).toMatchObject([
      { amountCents: BigInt(1_000_000), frequency: "MONTHLY", day: 1 },
    ]);
  });

  it("checks the amount range and the day, keeping the typed values", async () => {
    const values = { subeCardId: owner.sube, amount: "50", frequency: "WEEKLY", day: "8" };
    expect(await createTopUpSchedule(undefined, form(values))).toEqual({
      values: { amount: "50", frequency: "WEEKLY", day: "8" },
      errors: {
        amount: "El mínimo es $100 y el máximo $50.000.",
        day: "Elegí un día de la semana.",
      },
    });
  });

  it("never schedules on another user's SUBE card", async () => {
    expect(
      await createTopUpSchedule(
        undefined,
        form({ subeCardId: stranger.sube, amount: "1.000", frequency: "WEEKLY", day: "1" }),
      ),
    ).toMatchObject({ errors: { form: "Esta tarjeta SUBE ya no está disponible." } });
    expect(await db.topUpSchedule.count({ where: { subeCardId: stranger.sube } })).toBe(0);
  });
});

describe("deleteTopUpSchedule", () => {
  it("deletes the user's schedule and never another user's", async () => {
    const data = { amountCents: 100_000, frequency: "WEEKLY" as const, day: 1 };
    const mine = await db.topUpSchedule.create({
      data: { ...data, userId: owner.id, subeCardId: owner.sube },
    });
    const theirs = await db.topUpSchedule.create({
      data: { ...data, userId: stranger.id, subeCardId: stranger.sube },
    });

    await expect(deleteTopUpSchedule(form({ scheduleId: theirs.id }))).rejects.toThrow(
      "REDIRECT:/recargas/sube",
    );
    await expect(deleteTopUpSchedule(form({ scheduleId: mine.id }))).rejects.toThrow(
      `REDIRECT:/recargas/sube/${owner.sube}`,
    );

    expect(await db.topUpSchedule.findUnique({ where: { id: mine.id } })).toBeNull();
    expect(await db.topUpSchedule.findUnique({ where: { id: theirs.id } })).not.toBeNull();
  });
});
