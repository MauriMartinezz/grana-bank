import { describe, expect, it } from "vitest";
import { MAX_TRANSFER_CENTS, parseAmountToCents } from "./amount";

describe("parseAmountToCents", () => {
  it.each([
    ["125", 12500],
    ["125.5", 12550],
    ["125,50", 12550],
    ["0.01", 1],
    [" 9,99 ", 999],
    ["0012", 1200],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseAmountToCents(input)).toBe(cents);
  });

  it.each([
    "",
    "0",
    "0,00",
    "-5",
    "1.234,56",
    "12.345",
    "1e3",
    "abc",
    "12,",
    ",5",
    "Infinity",
  ])("rejects %j", (input) => {
    expect(parseAmountToCents(input)).toBeNull();
  });

  it("rejects amounts above the transfer limit", () => {
    expect(parseAmountToCents(String(MAX_TRANSFER_CENTS / 100))).toBe(
      MAX_TRANSFER_CENTS,
    );
    expect(parseAmountToCents(`${MAX_TRANSFER_CENTS / 100}.01`)).toBeNull();
  });

  it("never goes through floating point", () => {
    // 0.29 * 100 is 28.999999999999996 in floating point.
    expect(parseAmountToCents("0.29")).toBe(29);
    expect(parseAmountToCents("4.35")).toBe(435);
  });
});
