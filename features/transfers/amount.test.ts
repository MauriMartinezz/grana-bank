import { describe, expect, it } from "vitest";
import { MAX_TRANSFER_CENTS, parseAmountToCents } from "./amount";

// Argentine format everywhere, also for dollars: dots group thousands,
// a comma starts the decimals.
describe("parseAmountToCents", () => {
  it.each([
    ["125", 12500],
    ["125,5", 12550],
    ["125,50", 12550],
    ["0,01", 1],
    [" 9,99 ", 999],
    ["0012", 1200],
    ["1500", 150000],
    ["1.500", 150000],
    ["1.500,50", 150050],
    ["12.345", 1234500],
    ["123.456,78", 12345678],
    ["999.999,99", 99999999],
  ])("parses %j as %i cents", (input, cents) => {
    expect(parseAmountToCents(input)).toBe(cents);
  });

  it.each([
    "",
    "0",
    "0,00",
    "-5",
    "12.5",
    "125.50",
    "1.23",
    "1.2345",
    "1,234.56",
    "1.500,505",
    "1e3",
    "abc",
    "12,",
    ",5",
    ".500",
    "1..500",
    "Infinity",
  ])("rejects %j", (input) => {
    expect(parseAmountToCents(input)).toBeNull();
  });

  it("rejects amounts above the transfer limit", () => {
    expect(parseAmountToCents("1.000.000")).toBe(MAX_TRANSFER_CENTS);
    expect(parseAmountToCents("1.000.000,01")).toBeNull();
  });

  it("never goes through floating point", () => {
    // 0.29 * 100 is 28.999999999999996 in floating point.
    expect(parseAmountToCents("0,29")).toBe(29);
    expect(parseAmountToCents("4,35")).toBe(435);
  });
});
