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

const { createDepositSchedule, deleteDepositSchedule } = await import("./schedule-actions");
const { listDepositSchedules } = await import("./schedule-queries");

const EMAILS = ["owner@deposit-schedules.test", "stranger@deposit-schedules.test"];
let owner: string;
let stranger: string;

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function createUser(email: string, alias: string) {
  const user = await db.user.create({
    data: {
      email,
      firstName: "Test",
      lastName: "",
      passwordHash: "!",
      accounts: { create: { currency: "ARS", alias, balanceCents: 0 } },
    },
  });
  return user.id;
}

beforeEach(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
  owner = await createUser(EMAILS[0], "owner.depositschedules");
  stranger = await createUser(EMAILS[1], "stranger.depositschedules");
  current.user = { id: owner, name: "Owner" };
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: EMAILS } } });
});

describe("createDepositSchedule", () => {
  it("saves the schedule and says it is a demo", async () => {
    expect(
      await createDepositSchedule(
        undefined,
        form({ currency: "ARS", amount: "10.000", frequency: "MONTHLY", day: "1" }),
      ),
    ).toEqual({ notice: "Programamos $10.000 el día 1 de cada mes. Es una demo: no se ingresa dinero." });
    expect(await listDepositSchedules(owner)).toMatchObject([
      { currency: "ARS", amountCents: BigInt(1_000_000), frequency: "MONTHLY", day: 1 },
    ]);
  });

  it("needs an account in the chosen currency", async () => {
    expect(
      await createDepositSchedule(
        undefined,
        form({ currency: "USD", amount: "10", frequency: "WEEKLY", day: "1" }),
      ),
    ).toMatchObject({ errors: { currency: "No tenés una cuenta en dólares." } });
    expect(await listDepositSchedules(owner)).toEqual([]);
  });

  it("keeps the typed values with the errors", async () => {
    const values = { currency: "ARS", amount: "", frequency: "WEEKLY", day: "9" };
    expect(await createDepositSchedule(undefined, form(values))).toEqual({
      values,
      errors: { amount: "Ingresá un monto.", day: "Elegí un día de la semana." },
    });
  });
});

describe("deleteDepositSchedule", () => {
  it("deletes the user's schedule and never another user's", async () => {
    const mine = await db.depositSchedule.create({
      data: { userId: owner, currency: "ARS", amountCents: 100, frequency: "WEEKLY", day: 1 },
    });
    const theirs = await db.depositSchedule.create({
      data: { userId: stranger, currency: "ARS", amountCents: 100, frequency: "WEEKLY", day: 1 },
    });

    await expect(deleteDepositSchedule(form({ scheduleId: theirs.id }))).rejects.toThrow(
      "REDIRECT:/ingresar-dinero/programar",
    );
    await expect(deleteDepositSchedule(form({ scheduleId: mine.id }))).rejects.toThrow(
      "REDIRECT:/ingresar-dinero/programar",
    );

    expect(await db.depositSchedule.findUnique({ where: { id: mine.id } })).toBeNull();
    expect(await db.depositSchedule.findUnique({ where: { id: theirs.id } })).not.toBeNull();
    expect(await listDepositSchedules(stranger)).toHaveLength(1);
  });
});
