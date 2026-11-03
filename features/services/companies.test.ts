import { describe, expect, it } from "vitest";
import {
  COMPANY_INFO,
  isServiceCompany,
  MESSAGES,
  normalizePaymentNumber,
  SERVICE_COMPANIES,
  validateAdhesion,
} from "./companies";

describe("service companies", () => {
  it("lists AySA, Edesur, Edenor and Metrogas with their simulated number lengths", () => {
    expect(SERVICE_COMPANIES).toEqual(["AYSA", "EDESUR", "EDENOR", "METROGAS"]);
    expect(COMPANY_INFO).toEqual({
      AYSA: { name: "AySA", service: "Agua", numberLength: 10 },
      EDESUR: { name: "Edesur", service: "Luz", numberLength: 10 },
      EDENOR: { name: "Edenor", service: "Luz", numberLength: 12 },
      METROGAS: { name: "Metrogas", service: "Gas", numberLength: 11 },
    });
  });

  it.each([
    ["AYSA", true],
    ["METROGAS", true],
    ["edesur", false],
    ["NETFLIX", false],
    [undefined, false],
  ])("isServiceCompany(%s) is %s", (value, expected) => {
    expect(isServiceCompany(value)).toBe(expected);
  });
});

describe("normalizePaymentNumber", () => {
  it.each([
    ["AYSA", "0012345678", "0012345678"],
    ["EDESUR", "00 1234 5678", "0012345678"],
    ["EDENOR", "1234-5678-9012", "123456789012"],
    ["METROGAS", " 12345678901 ", "12345678901"],
  ] as const)("accepts a %s number typed as %j", (company, raw, expected) => {
    expect(normalizePaymentNumber(company, raw)).toBe(expected);
  });

  it.each([
    ["AYSA", "123456789"],
    ["AYSA", "12345678901"],
    ["EDESUR", "123456789012"],
    ["EDENOR", "1234567890"],
    ["METROGAS", "1234567890"],
    ["METROGAS", "1234567890a"],
    ["EDESUR", "12345.67890"],
    ["EDESUR", ""],
  ] as const)("rejects a %s number %j", (company, raw) => {
    expect(normalizePaymentNumber(company, raw)).toBeNull();
  });
});

describe("validateAdhesion", () => {
  it("returns the normalized adhesion", () => {
    expect(
      validateAdhesion({ company: "EDESUR", paymentNumber: "00 1234 5678", nickname: "  Luz   depto " }),
    ).toEqual({
      ok: true,
      adhesion: { company: "EDESUR", paymentNumber: "0012345678", nickname: "Luz depto" },
    });
  });

  it("reports every invalid field", () => {
    expect(validateAdhesion({ company: "EDENOR", paymentNumber: "1234", nickname: " " })).toEqual({
      ok: false,
      errors: {
        paymentNumber: "El número de pago electrónico de Edenor tiene 12 dígitos.",
        nickname: MESSAGES.nicknameEmpty,
      },
    });
  });

  it("asks for the number and the company when they are missing", () => {
    expect(validateAdhesion({ company: "OTRA", paymentNumber: "", nickname: "Luz" })).toEqual({
      ok: false,
      errors: { company: MESSAGES.companyInvalid, paymentNumber: MESSAGES.numberEmpty },
    });
    expect(validateAdhesion({ company: "AYSA", paymentNumber: "  ", nickname: "Agua" })).toEqual({
      ok: false,
      errors: { paymentNumber: MESSAGES.numberEmpty },
    });
  });

  it("takes a nickname of up to 40 characters", () => {
    const base = { company: "AYSA", paymentNumber: "0012345678" };
    expect(validateAdhesion({ ...base, nickname: "a".repeat(40) }).ok).toBe(true);
    expect(validateAdhesion({ ...base, nickname: "a".repeat(41) })).toEqual({
      ok: false,
      errors: { nickname: "El nombre tiene hasta 40 caracteres." },
    });
  });
});
