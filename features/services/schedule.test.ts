import { describe, expect, it } from "vitest";
import { parseScheduleDate, scheduledRun, type SchedulableBill } from "./schedule";

const TODAY = new Date("2026-11-10T00:00:00Z");
const DUE = new Date("2026-11-20T00:00:00Z");
const tooLate = (last: Date) => `hasta ${last.toISOString().slice(0, 10)}`;

describe("parseScheduleDate", () => {
  it("takes today, the due date and any day between", () => {
    for (const raw of ["2026-11-10", "2026-11-15", "2026-11-20"]) {
      expect(parseScheduleDate(raw, DUE, TODAY, tooLate)).toEqual({
        ok: true,
        date: new Date(`${raw}T00:00:00Z`),
      });
    }
  });

  it("rejects a day before today and a day after the due date", () => {
    expect(parseScheduleDate("2026-11-09", DUE, TODAY, tooLate)).toEqual({
      ok: false,
      error: "La fecha no puede ser anterior a hoy.",
    });
    expect(parseScheduleDate("2026-11-21", DUE, TODAY, tooLate)).toEqual({
      ok: false,
      error: "hasta 2026-11-20",
    });
  });

  it("allows only today for an overdue bill", () => {
    const overdue = new Date("2026-11-01T00:00:00Z");
    expect(parseScheduleDate("2026-11-10", overdue, TODAY, tooLate).ok).toBe(true);
    expect(parseScheduleDate("2026-11-11", overdue, TODAY, tooLate)).toEqual({
      ok: false,
      error: "hasta 2026-11-10",
    });
  });

  it("asks for a date when it is empty, malformed or does not exist", () => {
    for (const raw of ["", "10/11/2026", "2026-11-31", "2026-13-01"]) {
      expect(parseScheduleDate(raw, DUE, TODAY, tooLate)).toEqual({
        ok: false,
        error: "Elegí la fecha del pago.",
      });
    }
  });
});

describe("scheduledRun", () => {
  const bill = (overrides: Partial<SchedulableBill>): SchedulableBill => ({
    dueDate: DUE,
    scheduledFor: null,
    scheduledCardId: null,
    failedAt: null,
    adhesion: { autoDebitCardId: null },
    ...overrides,
  });

  it("runs a one-off schedule from its date with its card, even a removed one", () => {
    expect(scheduledRun(bill({ scheduledFor: TODAY, scheduledCardId: "c1" }), TODAY)).toEqual({
      due: true,
      cardId: "c1",
    });
    expect(scheduledRun(bill({ scheduledFor: TODAY }), TODAY)).toEqual({ due: true, cardId: null });
    expect(scheduledRun(bill({ scheduledFor: DUE, scheduledCardId: "c1" }), TODAY)).toEqual({
      due: false,
    });
  });

  it("runs the automatic debit from the due date, unless a schedule exists", () => {
    const auto = { adhesion: { autoDebitCardId: "c2" } };
    expect(scheduledRun(bill(auto), TODAY)).toEqual({ due: false });
    expect(scheduledRun(bill(auto), DUE)).toEqual({ due: true, cardId: "c2" });
    expect(
      scheduledRun(bill({ ...auto, scheduledFor: new Date("2026-11-25T00:00:00Z") }), DUE),
    ).toEqual({ due: false });
  });

  it("never runs a failed bill", () => {
    expect(
      scheduledRun(bill({ scheduledFor: TODAY, scheduledCardId: "c1", failedAt: TODAY }), TODAY),
    ).toEqual({ due: false });
  });
});
