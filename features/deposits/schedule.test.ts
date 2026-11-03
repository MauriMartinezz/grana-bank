import { describe, expect, it } from "vitest";
import { nextDepositDate, scheduleText, validateDepositSchedule } from "./schedule";

describe("validateDepositSchedule", () => {
  const valid = { currency: "ARS", amount: "10.000", frequency: "MONTHLY", day: "15" };

  it("reads a monthly and a weekly schedule", () => {
    expect(validateDepositSchedule(valid)).toEqual({
      ok: true,
      schedule: { currency: "ARS", amountCents: 1_000_000, frequency: "MONTHLY", day: 15 },
    });
    expect(
      validateDepositSchedule({ currency: "USD", amount: "50", frequency: "WEEKLY", day: "5" }),
    ).toEqual({
      ok: true,
      schedule: { currency: "USD", amountCents: 5_000, frequency: "WEEKLY", day: 5 },
    });
  });

  it("reports every invalid field", () => {
    expect(
      validateDepositSchedule({ currency: "EUR", amount: "", frequency: "DAILY", day: "x" }),
    ).toEqual({
      ok: false,
      errors: {
        currency: "Elegí la cuenta.",
        amount: "Ingresá un monto.",
        frequency: "Elegí cada cuánto.",
      },
    });
  });

  it("checks the day for the frequency and the amount against the deposit cap", () => {
    expect(validateDepositSchedule({ ...valid, day: "32" })).toEqual({
      ok: false,
      errors: { day: "Elegí un día del 1 al 31." },
    });
    expect(validateDepositSchedule({ ...valid, frequency: "WEEKLY", day: "8" })).toEqual({
      ok: false,
      errors: { day: "Elegí un día de la semana." },
    });
    expect(
      validateDepositSchedule({ ...valid, currency: "USD", amount: "10.000,01" }),
    ).toMatchObject({ ok: false, errors: { amount: expect.stringMatching(/^Podés ingresar hasta/) } });
  });
});

describe("scheduleText", () => {
  it("says when it repeats", () => {
    expect(scheduleText("MONTHLY", 15)).toBe("El día 15 de cada mes");
    expect(scheduleText("WEEKLY", 1)).toBe("Todos los lunes");
    expect(scheduleText("WEEKLY", 7)).toBe("Todos los domingos");
  });
});

describe("nextDepositDate", () => {
  // Tuesday 3 November 2026, afternoon in Buenos Aires.
  const NOW = new Date("2026-11-03T15:00:00Z");

  it("finds the next weekday, today included", () => {
    expect(nextDepositDate("WEEKLY", 2, NOW)).toEqual(new Date("2026-11-03T00:00:00Z"));
    expect(nextDepositDate("WEEKLY", 1, NOW)).toEqual(new Date("2026-11-09T00:00:00Z"));
  });

  it("finds the next day of the month, using a short month's last day", () => {
    expect(nextDepositDate("MONTHLY", 3, NOW)).toEqual(new Date("2026-11-03T00:00:00Z"));
    expect(nextDepositDate("MONTHLY", 2, NOW)).toEqual(new Date("2026-12-02T00:00:00Z"));
    expect(nextDepositDate("MONTHLY", 31, NOW)).toEqual(new Date("2026-11-30T00:00:00Z"));
    expect(nextDepositDate("MONTHLY", 30, new Date("2027-02-10T15:00:00Z"))).toEqual(
      new Date("2027-02-28T00:00:00Z"),
    );
  });
});
