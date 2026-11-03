import { describe, expect, it } from "vitest";
import { ARS_PER_USD, MAX_EXCHANGE_USD_CENTS, isExchangeAmount, usdToArsCents } from "./rate";

describe("exchange rate", () => {
  it("is 1500 pesos per dollar", () => {
    expect(ARS_PER_USD).toBe(1500);
  });

  it.each([
    [1, 1500],
    [100, 150000],
    [2550, 3825000],
    [MAX_EXCHANGE_USD_CENTS, MAX_EXCHANGE_USD_CENTS * 1500],
  ])("converts %i dollar cents to %i peso cents", (usdCents, arsCents) => {
    expect(usdToArsCents(usdCents)).toBe(BigInt(arsCents));
  });

  it("converts bigint dollar cents exactly, also past 2^53 peso cents", () => {
    expect(usdToArsCents(BigInt(2550))).toBe(BigInt(3825000));
    expect(usdToArsCents(BigInt(2) ** BigInt(53))).toBe(BigInt(2) ** BigInt(53) * BigInt(1500));
  });

  it.each([
    [1, true],
    [MAX_EXCHANGE_USD_CENTS, true],
    [0, false],
    [-1, false],
    [1.5, false],
    [Number.NaN, false],
    [MAX_EXCHANGE_USD_CENTS + 1, false],
  ])("accepts %d dollar cents as an amount: %s", (usdCents, valid) => {
    expect(isExchangeAmount(usdCents)).toBe(valid);
  });
});
