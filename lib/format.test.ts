import { describe, expect, it } from "vitest";
import { formatAmount, formatDate, formatDateTime, formatMoney } from "./format";

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

describe("formatAmount", () => {
  it("always shows two decimals and no currency symbol", () => {
    expect(formatAmount(97885)).toBe("978,85");
    expect(formatAmount(100000)).toBe("1.000,00");
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
