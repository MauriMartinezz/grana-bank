import { describe, expect, it } from "vitest";
import { addMonths, currentMonth, formatMonth, monthRange, parseMonth } from "./month";

// 2026-11-11 at 10:00 in Buenos Aires (UTC-3).
const NOW = new Date("2026-11-11T13:00:00Z");

describe("currentMonth", () => {
  it("is the Buenos Aires month, not the UTC one", () => {
    // 2026-12-01 01:00 UTC is still 2026-11-30 22:00 in Buenos Aires.
    expect(currentMonth(new Date("2026-12-01T01:00:00Z"))).toBe("2026-11");
    expect(currentMonth(new Date("2026-12-01T03:00:00Z"))).toBe("2026-12");
  });
});

describe("parseMonth", () => {
  it("reads a past or current month written as YYYY-MM", () => {
    expect(parseMonth("2026-10", NOW)).toBe("2026-10");
    expect(parseMonth("2025-01", NOW)).toBe("2025-01");
    expect(parseMonth("2026-11", NOW)).toBe("2026-11");
    expect(parseMonth(["2026-09", "2026-08"], NOW)).toBe("2026-09");
  });

  it.each([undefined, "", "2026-13", "2026-00", "2026-1", "noviembre", "2026-10-01", "2026-12", "2027-01"])(
    "falls back to the current month for %s",
    (value) => {
      expect(parseMonth(value, NOW)).toBe("2026-11");
    },
  );
});

describe("monthRange", () => {
  it("goes from midnight of the first day to midnight of the next month, in Buenos Aires", () => {
    expect(monthRange("2026-11")).toEqual({
      gte: new Date("2026-11-01T03:00:00Z"),
      lt: new Date("2026-12-01T03:00:00Z"),
    });
    expect(monthRange("2026-12")).toEqual({
      gte: new Date("2026-12-01T03:00:00Z"),
      lt: new Date("2027-01-01T03:00:00Z"),
    });
  });
});

describe("addMonths", () => {
  it("moves across years", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-05", 0)).toBe("2026-05");
  });
});

describe("formatMonth", () => {
  it("names the month in Spanish", () => {
    expect(formatMonth("2026-11")).toBe("Noviembre de 2026");
    expect(formatMonth("2026-01")).toBe("Enero de 2026");
  });
});
