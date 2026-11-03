import { describe, expect, it } from "vitest";
import { formatAmount, formatBalance, formatDate, formatDateTime, formatMoney } from "./format";

describe("formatMoney", () => {
  it("prefixes pesos with $ and dollars with USD$", () => {
    expect(formatMoney(500000, "ARS")).toBe("$5.000");
    expect(formatMoney(500000, "USD")).toBe("USD$5.000");
  });

  it("drops the decimals of whole amounts, as the design does", () => {
    expect(formatMoney(12500, "ARS")).toBe("$125");
  });

  it("keeps two decimals with a comma when the amount has cents", () => {
    expect(formatMoney(1299, "ARS")).toBe("$12,99");
    expect(formatMoney(1250, "USD")).toBe("USD$12,50");
  });

  it("uses dots for thousands", () => {
    expect(formatMoney(123456789, "ARS")).toBe("$1.234.567,89");
  });
});

describe("formatMoney with bigint cents", () => {
  it("formats the same as a number for the same amount", () => {
    expect(formatMoney(BigInt(500000), "ARS")).toBe("$5.000");
    expect(formatMoney(BigInt(1250), "USD")).toBe("USD$12,50");
    expect(formatMoney(BigInt(123456789), "ARS")).toBe("$1.234.567,89");
    expect(formatMoney(BigInt(5), "ARS")).toBe("$0,05");
    expect(formatMoney(BigInt(0), "ARS")).toBe("$0");
    expect(formatMoney(BigInt(-5050), "ARS")).toBe(formatMoney(-5050, "ARS"));
  });

  it("formats balances past the old 32-bit limit", () => {
    expect(formatMoney(BigInt(2 ** 31), "ARS")).toBe("$21.474.836,48");
    expect(formatMoney(BigInt(3_000_000_000), "USD")).toBe("USD$30.000.000");
  });

  it("formats balances past 2^53 cents exactly, without floating point", () => {
    // 2^53 + 1 is the first integer a float cannot hold.
    expect(formatMoney(BigInt(2) ** BigInt(53) + BigInt(1), "ARS")).toBe("$90.071.992.547.409,93");
    expect(formatMoney(BigInt("123456789012345678901"), "USD")).toBe(
      "USD$1.234.567.890.123.456.789,01",
    );
  });
});

describe("formatAmount", () => {
  it("always shows two decimals and no currency symbol", () => {
    expect(formatAmount(97885)).toBe("978,85");
    expect(formatAmount(100000)).toBe("1.000,00");
  });

  it("formats bigint cents exactly, also past 2^31 and 2^53", () => {
    expect(formatAmount(BigInt(97885))).toBe("978,85");
    expect(formatAmount(BigInt(100000))).toBe("1.000,00");
    expect(formatAmount(BigInt(2 ** 31))).toBe("21.474.836,48");
    expect(formatAmount(BigInt(2) ** BigInt(53) + BigInt(1))).toBe("90.071.992.547.409,93");
    expect(formatAmount(BigInt(-5050))).toBe(formatAmount(-5050));
  });
});

describe("formatBalance", () => {
  it("prefixes the currency and always shows two decimals", () => {
    expect(formatBalance(97885, "ARS")).toBe("$978,85");
    expect(formatBalance(BigInt(97885), "USD")).toBe("USD$978,85");
    expect(formatBalance(BigInt(100000), "ARS")).toBe("$1.000,00");
    expect(formatBalance(BigInt(2) ** BigInt(53) + BigInt(1), "ARS")).toBe("$90.071.992.547.409,93");
  });
});

describe("formatDateTime", () => {
  it("uses the Buenos Aires time zone regardless of the server zone", () => {
    const formatted = formatDateTime(new Date("2026-10-30T02:20:00Z"));
    expect(formatted).toContain("29 de octubre de 2026");
    expect(formatted).toContain("23:20");
  });
});

describe("formatDate", () => {
  it("shows the Buenos Aires calendar date without the time", () => {
    expect(formatDate(new Date("2026-03-09T15:30:00Z"))).toBe("9 de marzo de 2026");
    // 01:00 UTC on 1 December is still 30 November in Buenos Aires.
    expect(formatDate(new Date("2026-12-01T01:00:00Z"))).toBe("30 de noviembre de 2026");
  });
});
