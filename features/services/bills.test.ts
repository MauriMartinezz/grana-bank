import { describe, expect, it } from "vitest";
import { orderBills, periodLabel, simulatedBills } from "./bills";
import { buenosAiresDate, daysUntil, dueLabel, formatDueDate } from "./due-date";

// 2026-11-03 at 01:00 UTC is still November 2 in Buenos Aires (UTC-3).
const NOV_3_UTC = new Date("2026-11-03T15:00:00Z");

describe("buenosAiresDate", () => {
  it("reads the calendar date in Buenos Aires", () => {
    expect(buenosAiresDate(NOV_3_UTC)).toEqual({ year: 2026, month: 11, day: 3 });
    expect(buenosAiresDate(new Date("2026-11-01T01:00:00Z"))).toEqual({
      year: 2026,
      month: 10,
      day: 31,
    });
  });
});

describe("periodLabel", () => {
  it("names the month in Spanish", () => {
    expect(periodLabel(2026, 11)).toBe("Noviembre 2026");
    expect(periodLabel(2027, 1)).toBe("Enero 2027");
  });
});

describe("simulatedBills", () => {
  it("creates the previous and the current month's bills", () => {
    const bills = simulatedBills("EDESUR", "0012345678", NOV_3_UTC);

    expect(bills.map((bill) => bill.period)).toEqual(["Octubre 2026", "Noviembre 2026"]);
    for (const [index, bill] of bills.entries()) {
      expect(bill.currency).toBe("ARS");
      // Whole pesos between $8.000 and $60.000.
      expect(bill.amountCents % BigInt(100)).toBe(BigInt(0));
      expect(bill.amountCents >= BigInt(800_000)).toBe(true);
      expect(bill.amountCents <= BigInt(6_000_000)).toBe(true);
      // A calendar date between the 10th and the 20th of its month.
      expect(bill.dueDate.getUTCHours()).toBe(0);
      expect(bill.dueDate.getUTCMonth()).toBe(9 + index);
      expect(bill.dueDate.getUTCDate()).toBeGreaterThanOrEqual(10);
      expect(bill.dueDate.getUTCDate()).toBeLessThanOrEqual(20);
    }
  });

  it("gives the same bills for the same number and month", () => {
    expect(simulatedBills("EDESUR", "0012345678", NOV_3_UTC)).toEqual(
      simulatedBills("EDESUR", "0012345678", new Date("2026-11-28T12:00:00Z")),
    );
  });

  it("pins the amounts of one number, so the demo is stable", () => {
    expect(
      simulatedBills("EDESUR", "0012345678", NOV_3_UTC).map((bill) => [
        bill.amountCents,
        bill.dueDate.toISOString().slice(0, 10),
      ]),
    ).toEqual([
      [BigInt(1_890_200), "2026-10-17"],
      [BigInt(1_369_700), "2026-11-20"],
    ]);
  });

  it("gives other amounts to another number", () => {
    const one = simulatedBills("EDESUR", "0012345678", NOV_3_UTC);
    const other = simulatedBills("EDESUR", "0012345679", NOV_3_UTC);
    expect(one.map((bill) => bill.amountCents)).not.toEqual(
      other.map((bill) => bill.amountCents),
    );
  });

  it("wraps January back to December of the year before", () => {
    const bills = simulatedBills("AYSA", "0012345678", new Date("2027-01-15T15:00:00Z"));
    expect(bills.map((bill) => bill.period)).toEqual(["Diciembre 2026", "Enero 2027"]);
    expect(bills[0].dueDate.getUTCFullYear()).toBe(2026);
    expect(bills[0].dueDate.getUTCMonth()).toBe(11);
  });

  it("spreads amounts over the whole range", () => {
    const amounts = new Set(
      Array.from({ length: 200 }, (_, i) =>
        simulatedBills("METROGAS", String(10_000_000_000 + i), NOV_3_UTC)[1].amountCents,
      ),
    );
    expect(amounts.size).toBeGreaterThan(190);
  });
});

describe("due dates", () => {
  const due = new Date(Date.UTC(2026, 10, 10));

  it("counts calendar days in Buenos Aires", () => {
    expect(daysUntil(due, new Date("2026-11-03T15:00:00Z"))).toBe(7);
    // 23:30 on November 9 in Buenos Aires.
    expect(daysUntil(due, new Date("2026-11-10T02:30:00Z"))).toBe(1);
    expect(daysUntil(due, new Date("2026-11-10T15:00:00Z"))).toBe(0);
    expect(daysUntil(due, new Date("2026-11-11T15:00:00Z"))).toBe(-1);
  });

  it.each([
    ["2026-11-03T15:00:00Z", "Vence en 7 días"],
    ["2026-11-09T15:00:00Z", "Vence mañana"],
    ["2026-11-10T15:00:00Z", "Vence hoy"],
    ["2026-11-11T15:00:00Z", "Vencida"],
  ])("on %s reads %j", (now, label) => {
    expect(dueLabel(due, new Date(now))).toBe(label);
  });

  it("formats the date without shifting it to the previous day", () => {
    expect(formatDueDate(due)).toBe("10 de noviembre de 2026");
  });
});

describe("orderBills", () => {
  it("lists pending bills first by due date, then paid ones newest first", () => {
    const bill = (id: string, status: "PENDING" | "PAID", due: number, paid?: number) => ({
      id,
      status,
      dueDate: new Date(Date.UTC(2026, 10, due)),
      paidAt: paid ? new Date(Date.UTC(2026, 10, paid)) : null,
    });
    const ordered = orderBills([
      bill("paid-old", "PAID", 1, 2),
      bill("pending-late", "PENDING", 20),
      bill("paid-new", "PAID", 3, 5),
      bill("pending-soon", "PENDING", 10),
    ]);
    expect(ordered.map((b) => b.id)).toEqual([
      "pending-soon",
      "pending-late",
      "paid-new",
      "paid-old",
    ]);
  });
});
