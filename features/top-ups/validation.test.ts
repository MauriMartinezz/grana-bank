import { describe, expect, it } from "vitest";
import {
  formatPhone,
  formatSubeNumber,
  isProviderOf,
  maskDigits,
  MAX_TOP_UP_CENTS,
  MIN_TOP_UP_CENTS,
  normalizeDirectvAccount,
  normalizePhone,
  normalizeSubeNumber,
  parseTopUpAmount,
  validateNickname,
  validateSubeCard,
} from "./validation";

describe("normalizeSubeNumber", () => {
  it.each([
    ["6061123456789012", "6061123456789012"],
    ["6061 1234 5678 9012", "6061123456789012"],
    ["  6061 1234 56789012 ", "6061123456789012"],
  ])("accepts %j", (input, expected) => {
    expect(normalizeSubeNumber(input)).toBe(expected);
  });

  it.each([
    ["", "empty"],
    ["606112345678901", "15 digits"],
    ["60611234567890123", "17 digits"],
    ["6062123456789012", "another prefix"],
    ["4061123456789012", "a bank card prefix"],
    ["6061-1234-5678-9012", "dashes"],
    ["6061 1234 5678 901a", "a letter"],
  ])("rejects %j (%s)", (input) => {
    expect(normalizeSubeNumber(input)).toBeNull();
  });
});

describe("formatSubeNumber", () => {
  it("groups the digits by four while typing", () => {
    expect(formatSubeNumber("6061123456789012")).toBe("6061 1234 5678 9012");
    expect(formatSubeNumber("60611")).toBe("6061 1");
    expect(formatSubeNumber("6061 12a34")).toBe("6061 1234");
  });

  it("keeps at most 16 digits", () => {
    expect(formatSubeNumber("60611234567890123456")).toBe("6061 1234 5678 9012");
  });
});

describe("validateNickname", () => {
  it("trims and collapses spaces", () => {
    expect(validateNickname("  sube   de mauri ")).toEqual({ ok: true, nickname: "sube de mauri" });
  });

  it("accepts 40 characters and rejects 41", () => {
    expect(validateNickname("a".repeat(40))).toEqual({ ok: true, nickname: "a".repeat(40) });
    expect(validateNickname("a".repeat(41))).toEqual({
      ok: false,
      error: "El nombre tiene hasta 40 caracteres.",
    });
  });

  it("requires a name", () => {
    expect(validateNickname("   ")).toEqual({
      ok: false,
      error: "Poné un nombre para reconocer la tarjeta.",
    });
  });
});

describe("validateSubeCard", () => {
  it("returns the digits and the trimmed nickname", () => {
    expect(validateSubeCard({ number: "6061 2345 6789 0123", nickname: " sube de mauri " })).toEqual({
      ok: true,
      card: { number: "6061234567890123", nickname: "sube de mauri" },
    });
  });

  it("reports every field", () => {
    expect(validateSubeCard({ number: "", nickname: "" })).toEqual({
      ok: false,
      errors: {
        number: "Ingresá el número de la tarjeta SUBE.",
        nickname: "Poné un nombre para reconocer la tarjeta.",
      },
    });
    expect(validateSubeCard({ number: "1234", nickname: "ok" })).toEqual({
      ok: false,
      errors: {
        number: "El número SUBE tiene 16 dígitos y empieza con 6061.",
      },
    });
  });
});

describe("normalizePhone", () => {
  it.each([
    ["1112345678", "1112345678"],
    ["11 1234 5678", "1112345678"],
    ["11-1234-5678", "1112345678"],
    ["(11) 1234-5678", "1112345678"],
    ["+54 11 1234 5678", "1112345678"],
    ["+54 9 11 1234 5678", "1112345678"],
    ["+5491112345678", "1112345678"],
    ["5491112345678", "1112345678"],
    ["541112345678", "1112345678"],
    ["9 11 1234 5678", "1112345678"],
    ["011 1234 5678", "1112345678"],
    ["011 15 1234 5678", "1112345678"],
    ["11 15 1234 5678", "1112345678"],
    ["351 123 4567", "3511234567"],
    ["+54 9 351 123 4567", "3511234567"],
    ["0351 15 123 4567", "3511234567"],
    ["2966 15 12 3456", "2966123456"],
  ])("normalizes %j", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    ["", "empty"],
    ["12345678", "too short"],
    ["111234567890", "too long without a 15"],
    ["0112345678", "starts with 0 after the trunk prefix"],
    ["+55 11 1234 5678", "another country"],
    ["+54 0 11 1234 5678", "a trunk 0 after the country code"],
    ["11 1234 567a", "a letter"],
    ["11.1234.5678", "dots"],
    ["351 99 123 4567", "12 digits without a 15 after the area code"],
    ["11 2 15 1234 567", "a 15 that is not right after the 11"],
  ])("rejects %j (%s)", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("formatPhone", () => {
  it("groups Buenos Aires numbers as 2-4-4", () => {
    expect(formatPhone("1112345678")).toBe("+54 11 1234 5678");
  });

  it("groups every other number as 3-3-4", () => {
    expect(formatPhone("3511234567")).toBe("+54 351 123 4567");
    expect(formatPhone("2966123456")).toBe("+54 296 612 3456");
  });
});

describe("normalizeDirectvAccount", () => {
  it.each([
    ["12345678", "12345678"],
    ["123456789012", "123456789012"],
    ["1234 5678", "12345678"],
    ["1234-5678-90", "1234567890"],
  ])("accepts %j", (input, expected) => {
    expect(normalizeDirectvAccount(input)).toBe(expected);
  });

  it.each(["", "1234567", "1234567890123", "1234 567a"])("rejects %j", (input) => {
    expect(normalizeDirectvAccount(input)).toBeNull();
  });
});

describe("maskDigits", () => {
  it("shows the last four digits only", () => {
    expect(maskDigits("1234567890124321")).toBe("···· 4321");
    expect(maskDigits("87654321")).toBe("···· 4321");
  });
});

describe("parseTopUpAmount", () => {
  it("accepts $100 to $50.000 inclusive, in cents", () => {
    expect(parseTopUpAmount("100")).toEqual({ ok: true, cents: MIN_TOP_UP_CENTS });
    expect(parseTopUpAmount("50.000")).toEqual({ ok: true, cents: MAX_TOP_UP_CENTS });
    expect(parseTopUpAmount("1.500,50")).toEqual({ ok: true, cents: 150050 });
  });

  it.each([
    ["", "Ingresá cuánto querés cargar."],
    ["12.5", "Ingresá un monto válido, por ejemplo 1.500 o 2.000,50."],
    ["abc", "Ingresá un monto válido, por ejemplo 1.500 o 2.000,50."],
    ["99,99", "El mínimo es $100 y el máximo $50.000."],
    ["50.000,01", "El mínimo es $100 y el máximo $50.000."],
  ])("rejects %j", (input, error) => {
    expect(parseTopUpAmount(input)).toEqual({ ok: false, error });
  });
});

describe("isProviderOf", () => {
  it("pairs each kind with its providers", () => {
    expect(isProviderOf("SUBE", "SUBE")).toBe(true);
    expect(isProviderOf("PHONE", "TUENTI")).toBe(true);
    expect(isProviderOf("DIRECTV", "DIRECTV")).toBe(true);
    expect(isProviderOf("PHONE", "SUBE")).toBe(false);
    expect(isProviderOf("SUBE", "PERSONAL")).toBe(false);
    expect(isProviderOf("PHONE", "NEXTEL")).toBe(false);
  });
});
