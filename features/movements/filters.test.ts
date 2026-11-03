import { describe, expect, it } from "vitest";
import {
  dateFilterPresets,
  hasActiveFilters,
  hasDateFilter,
  parseMovementFilters,
} from "./filters";

describe("parseMovementFilters", () => {
  it("returns no filters for an empty URL", () => {
    expect(parseMovementFilters({})).toEqual({ query: "", type: null });
  });

  it("trims the search text", () => {
    expect(parseMovementFilters({ q: "  adobe " }).query).toBe("adobe");
  });

  it("limits the length of the search text", () => {
    expect(parseMovementFilters({ q: "a".repeat(500) }).query).toHaveLength(100);
  });

  it("maps each URL value to its movement type", () => {
    expect(parseMovementFilters({ type: "subscription" }).type).toBe("SUBSCRIPTION");
    expect(parseMovementFilters({ type: "received" }).type).toBe("RECEIVED");
    expect(parseMovementFilters({ type: "sent" }).type).toBe("SENT");
  });

  it("ignores unknown types instead of failing", () => {
    expect(parseMovementFilters({ type: "hacked" }).type).toBeNull();
  });

  it("ignores names inherited from Object", () => {
    expect(parseMovementFilters({ type: "constructor" }).type).toBeNull();
    expect(parseMovementFilters({ type: "toString" }).type).toBeNull();
  });

  it("uses the first value of repeated parameters", () => {
    expect(parseMovementFilters({ q: ["uno", "dos"] }).query).toBe("uno");
  });
});

describe("hasActiveFilters", () => {
  it("is false only when there is no search text and no type", () => {
    expect(hasActiveFilters({ query: "", type: null })).toBe(false);
    expect(hasActiveFilters({ query: "a", type: null })).toBe(true);
    expect(hasActiveFilters({ query: "", type: "SENT" })).toBe(true);
  });
});

describe("parseMovementFilters dates", () => {
  it("reads valid desde and hasta days", () => {
    expect(parseMovementFilters({ desde: "2026-10-01", hasta: "2026-10-31" })).toEqual({
      query: "",
      type: null,
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });

  it("accepts a single bound and the same day on both", () => {
    expect(parseMovementFilters({ desde: "2026-10-01" })).toEqual({
      query: "",
      type: null,
      from: "2026-10-01",
    });
    expect(parseMovementFilters({ hasta: "2026-10-31" })).toEqual({
      query: "",
      type: null,
      to: "2026-10-31",
    });
    const sameDay = parseMovementFilters({ desde: "2026-10-05", hasta: "2026-10-05" });
    expect([sameDay.from, sameDay.to]).toEqual(["2026-10-05", "2026-10-05"]);
  });

  it("ignores invalid days instead of failing", () => {
    for (const value of ["", "hoy", "2026-13-01", "2026-02-30", "2026-1-5", "2026-10-01T00:00", " 2026-10-01"]) {
      const filters = parseMovementFilters({ desde: value, hasta: value });
      expect(filters.from).toBeUndefined();
      expect(filters.to).toBeUndefined();
    }
  });

  it("keeps the valid bound when the other one is invalid", () => {
    const filters = parseMovementFilters({ desde: "nope", hasta: "2026-10-31" });
    expect([filters.from, filters.to]).toEqual([undefined, "2026-10-31"]);
  });

  it("ignores a reversed range and shows everything", () => {
    const filters = parseMovementFilters({ desde: "2026-10-31", hasta: "2026-10-01" });
    expect([filters.from, filters.to]).toEqual([undefined, undefined]);
  });

  it("combines dates with the search and type filters", () => {
    expect(
      parseMovementFilters({ q: "adobe", type: "sent", desde: ["2026-10-01", "x"], hasta: "2026-10-02" }),
    ).toEqual({ query: "adobe", type: "SENT", from: "2026-10-01", to: "2026-10-02" });
  });

  it("counts dates as active filters", () => {
    expect(hasActiveFilters({ query: "", type: null, from: "2026-10-01" })).toBe(true);
    expect(hasActiveFilters({ query: "", type: null, to: "2026-10-01" })).toBe(true);
    expect(hasDateFilter({ query: "a", type: "SENT" })).toBe(false);
    expect(hasDateFilter({ query: "", type: null, to: "2026-10-01" })).toBe(true);
  });
});

describe("dateFilterPresets", () => {
  // 00:30 on 3 November in Buenos Aires.
  const now = new Date("2026-11-03T03:30:00Z");

  it("computes Hoy, Últimos 7 días and Este mes in Buenos Aires days", () => {
    expect(dateFilterPresets(now)).toEqual([
      { label: "Hoy", from: "2026-11-03", to: "2026-11-03" },
      { label: "Últimos 7 días", from: "2026-10-28", to: "2026-11-03" },
      { label: "Este mes", from: "2026-11-01", to: "2026-11-03" },
    ]);
  });

  it("uses the Buenos Aires day just before its midnight", () => {
    const lateNight = new Date("2026-11-01T02:30:00Z"); // 23:30 on 31 October
    expect(dateFilterPresets(lateNight)[2]).toEqual({
      label: "Este mes",
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });
});
