import { describe, expect, it } from "vitest";
import {
  detectBrand,
  buenosAiresMonth,
  expiryStatus,
  formatCardNumber,
  isLuhnValid,
  normalizeCardNumber,
  validateCard,
} from "./validation";

// 15 March 2027: cards expiring in 03/27 are still valid this month.
const NOW = new Date(2027, 2, 15);

const VALID = { number: "4111 1111 1111 1111", holder: "Ana Pérez", expiry: "12/29", cvv: "123" };

function errorsFor(fields: Partial<typeof VALID>) {
  const result = validateCard({ ...VALID, ...fields }, NOW);
  return result.ok ? {} : result.errors;
}

describe("normalizeCardNumber", () => {
  it("strips spaces and dashes", () => {
    expect(normalizeCardNumber(" 4111-1111 1111\t1111 ")).toBe("4111111111111111");
  });
});

describe("formatCardNumber", () => {
  it("groups by four, and Amex as 4-6-5", () => {
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(formatCardNumber("41111")).toBe("4111 1");
    expect(formatCardNumber("3782822")).toBe("3782 822");
  });
});

describe("detectBrand", () => {
  it.each([
    ["4111111111111111", "VISA"],
    ["4012888888881881", "VISA"],
    ["5555555555554444", "MASTERCARD"],
    ["2223003122003222", "MASTERCARD"],
    ["378282246310005", "AMEX"],
    ["371449635398431", "AMEX"],
  ])("detects %s as %s", (number, brand) => {
    expect(detectBrand(number)).toBe(brand);
  });

  it.each([
    ["4", "VISA"],
    ["51", "MASTERCARD"],
    ["55", "MASTERCARD"],
    ["2221", "MASTERCARD"],
    ["2720", "MASTERCARD"],
    ["34", "AMEX"],
    ["37", "AMEX"],
    ["4111 11", "VISA"],
  ])("detects the prefix %j while typing as %s", (prefix, brand) => {
    expect(detectBrand(prefix)).toBe(brand);
  });

  it.each(["", "3", "5", "2", "22", "272", "50", "56", "2220", "2721", "35", "30569309025904", "6011111111111117"])(
    "returns null for %j",
    (prefix) => {
      expect(detectBrand(prefix)).toBeNull();
    },
  );
});

describe("isLuhnValid", () => {
  it("accepts the test numbers and rejects a changed digit", () => {
    expect(isLuhnValid("4111111111111111")).toBe(true);
    expect(isLuhnValid("378282246310005")).toBe(true);
    expect(isLuhnValid("4111111111111112")).toBe(false);
    expect(isLuhnValid("5555555555554445")).toBe(false);
  });
});

describe("validateCard", () => {
  it.each([
    ["4111111111111111", "VISA", "1111"],
    ["4012888888881881", "VISA", "1881"],
    ["5555 5555 5555 4444", "MASTERCARD", "4444"],
    ["2223-0031-2200-3222", "MASTERCARD", "3222"],
  ])("accepts %s as %s and keeps only the card face", (number, brand, last4) => {
    expect(validateCard({ ...VALID, number }, NOW)).toEqual({
      ok: true,
      card: { brand, last4, holder: "Ana Pérez", expiry: "12/29" },
    });
  });

  it.each([
    ["378282246310005", "0005"],
    ["371449635398431", "8431"],
  ])("accepts the Amex %s with a 4 digit code", (number, last4) => {
    expect(validateCard({ ...VALID, number, cvv: "1234" }, NOW)).toEqual({
      ok: true,
      card: { brand: "AMEX", last4, holder: "Ana Pérez", expiry: "12/29" },
    });
  });

  it("accepts 13 and 19 digit Visa numbers", () => {
    expect(validateCard({ ...VALID, number: "4222222222222" }, NOW).ok).toBe(true);
    expect(validateCard({ ...VALID, number: "4111111111111111110" }, NOW).ok).toBe(true);
  });

  it.each(["30569309025904", "6011111111111117"])(
    "rejects the unsupported brand of %s",
    (number) => {
      expect(errorsFor({ number }).number).toBe(
        "Solo aceptamos Visa, Mastercard o American Express.",
      );
    },
  );

  it.each([
    ["a Luhn failure", "4111111111111112"],
    ["a Mastercard Luhn failure", "5555555555554445"],
    ["an Amex Luhn failure", "378282246310006"],
    ["a 15 digit Visa", "411111111111116"],
    ["a 15 digit Mastercard", "555555555555444"],
    ["a 16 digit Amex", "3782822463100050"],
    ["letters", "4111 1111 abcd 1111"],
  ])("rejects %s", (_case, number) => {
    expect(errorsFor({ number }).number).toBe("El número de tarjeta no es válido.");
  });

  it("asks for the number when it is empty", () => {
    expect(errorsFor({ number: "  " }).number).toBe("Ingresá el número de tarjeta.");
  });

  it("trims the holder and collapses its spaces", () => {
    const result = validateCard({ ...VALID, holder: "  Ana   María  Núñez " }, NOW);
    expect(result.ok && result.card.holder).toBe("Ana María Núñez");
  });

  it.each([
    ["", "Ingresá el nombre como figura en la tarjeta."],
    ["Ana 2", "El nombre solo puede tener letras y espacios."],
    ["Ana_Pérez", "El nombre solo puede tener letras y espacios."],
    ["A".repeat(27), "El nombre tiene hasta 26 caracteres."],
  ])("rejects the holder %j", (holder, error) => {
    expect(errorsFor({ holder }).holder).toBe(error);
  });

  it.each(["03/27", "04/27", "01/28", " 12/30 "])("accepts the expiry %j", (expiry) => {
    expect(errorsFor({ expiry }).expiry).toBeUndefined();
  });

  it("keeps a card valid until the last day of its month", () => {
    const lastDay = new Date("2027-03-31T23:59:59-03:00");
    const nextMonth = new Date("2027-04-01T00:00:00-03:00");
    const card = { ...VALID, expiry: "03/27" };
    expect(validateCard(card, lastDay).ok).toBe(true);
    expect(validateCard(card, nextMonth).ok).toBe(false);
  });

  it("uses the Buenos Aires calendar month, whatever the server time zone", () => {
    const card = { ...VALID, expiry: "11/26" };
    // 22:00 on 30 November in Buenos Aires, already 1 December in UTC.
    expect(validateCard(card, new Date("2026-12-01T01:00:00Z")).ok).toBe(true);
    // Midnight on 1 December in Buenos Aires.
    expect(validateCard(card, new Date("2026-12-01T03:00:00Z")).ok).toBe(false);
  });

  it.each([
    ["", "Ingresá la fecha de vencimiento."],
    ["0327", "Ingresá el vencimiento como MM/AA."],
    ["3/27", "Ingresá el vencimiento como MM/AA."],
    ["03/2027", "Ingresá el vencimiento como MM/AA."],
    ["00/28", "El mes de vencimiento no es válido."],
    ["13/28", "El mes de vencimiento no es válido."],
    ["02/27", "La tarjeta está vencida."],
    ["12/26", "La tarjeta está vencida."],
  ])("rejects the expiry %j", (expiry, error) => {
    expect(errorsFor({ expiry }).expiry).toBe(error);
  });

  it.each([
    ["Visa", "4111111111111111", "1234", "El código de seguridad tiene 3 dígitos."],
    ["Visa", "4111111111111111", "12", "El código de seguridad tiene 3 dígitos."],
    ["Mastercard", "5555555555554444", "12a", "El código de seguridad tiene 3 dígitos."],
    ["Amex", "378282246310005", "123", "El código de seguridad tiene 4 dígitos."],
    ["Amex", "378282246310005", "12345", "El código de seguridad tiene 4 dígitos."],
    ["Visa", "4111111111111111", "", "Ingresá el código de seguridad."],
  ])("rejects a %s code %j", (_brand, number, cvv, error) => {
    expect(errorsFor({ number, cvv }).cvv).toBe(error);
  });

  it("reports every invalid field at once with the detected brand", () => {
    expect(
      validateCard({ number: "378282246310006", holder: "", expiry: "01/20", cvv: "1" }, NOW),
    ).toEqual({
      ok: false,
      brand: "AMEX",
      errors: {
        number: "El número de tarjeta no es válido.",
        holder: "Ingresá el nombre como figura en la tarjeta.",
        expiry: "La tarjeta está vencida.",
        cvv: "El código de seguridad tiene 4 dígitos.",
      },
    });
  });
});

describe("buenosAiresMonth", () => {
  it("counts months in the Buenos Aires calendar", () => {
    expect(buenosAiresMonth(new Date("2026-12-01T02:59:59Z"))).toBe(2026 * 12 + 10);
    expect(buenosAiresMonth(new Date("2026-12-01T03:00:00Z"))).toBe(2026 * 12 + 11);
    expect(buenosAiresMonth(new Date("2027-01-01T02:00:00Z"))).toBe(2026 * 12 + 11);
  });
});

describe("expiryStatus", () => {
  // 22:00 on 30 November 2026 in Buenos Aires, 1 December in UTC.
  const now = new Date("2026-12-01T01:00:00Z");

  it.each([
    ["10/26", "expired"],
    ["11/26", "expiring"],
    ["12/26", "expiring"],
    ["01/27", "valid"],
    ["12/30", "valid"],
  ])("reports %j as %s", (expiry, status) => {
    expect(expiryStatus(expiry, now)).toBe(status);
  });

  it("rolls the next month over the year", () => {
    const december = new Date("2026-12-15T12:00:00-03:00");
    expect(expiryStatus("01/27", december)).toBe("expiring");
    expect(expiryStatus("02/27", december)).toBe("valid");
    expect(expiryStatus("11/26", december)).toBe("expired");
  });

  it("returns null for an expiry that is not MM/YY", () => {
    expect(expiryStatus("13/26", now)).toBeNull();
    expect(expiryStatus("1126", now)).toBeNull();
  });
});
