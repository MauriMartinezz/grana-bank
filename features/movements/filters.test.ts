import { describe, expect, it } from "vitest";
import { hasActiveFilters, parseMovementFilters } from "./filters";

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
