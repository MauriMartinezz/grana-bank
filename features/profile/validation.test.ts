import { describe, expect, it } from "vitest";
import {
  PROFILE_MESSAGES,
  parsePreferredCurrency,
  validateAlias,
  validateNewEmail,
  validatePersonalData,
} from "./validation";

const VALID = { firstName: "Ana", lastName: "Pérez", address: "", phone: "" };

describe("validatePersonalData", () => {
  it("trims every field and collapses repeated spaces", () => {
    expect(
      validatePersonalData({
        firstName: "  María   José ",
        lastName: " Muñoz ",
        address: "  Av. Corrientes   1234 ",
        phone: " +54 11 1234-5678 ",
      }),
    ).toEqual({
      values: {
        firstName: "María José",
        lastName: "Muñoz",
        address: "Av. Corrientes 1234",
        phone: "+54 11 1234-5678",
      },
      errors: {},
    });
  });

  it.each(["Ana", "José", "Ñandú", "O'Brien", "O’Brien", "Jean-Luc", "a".repeat(50)])(
    "accepts the name %j",
    (firstName) => {
      expect(validatePersonalData({ ...VALID, firstName }).errors).toEqual({});
      expect(validatePersonalData({ ...VALID, lastName: firstName }).errors).toEqual({});
    },
  );

  it("requires the first and last name", () => {
    expect(validatePersonalData({ ...VALID, firstName: " ", lastName: "" }).errors).toEqual({
      firstName: PROFILE_MESSAGES.firstNameEmpty,
      lastName: PROFILE_MESSAGES.lastNameEmpty,
    });
  });

  it.each(["Ana1", "Ana!", "a".repeat(51), "--", "'"])("rejects the name %j", (name) => {
    expect(validatePersonalData({ ...VALID, firstName: name, lastName: name }).errors).toEqual({
      firstName: PROFILE_MESSAGES.firstNameInvalid,
      lastName: PROFILE_MESSAGES.lastNameInvalid,
    });
  });

  it("leaves the address optional, up to 120 characters", () => {
    expect(validatePersonalData({ ...VALID, address: "a".repeat(120) }).errors).toEqual({});
    expect(validatePersonalData({ ...VALID, address: "a".repeat(121) }).errors).toEqual({
      address: PROFILE_MESSAGES.addressTooLong,
    });
  });

  it.each(["", "11 1234 5678", "+54 (11) 1234-5678", "12345678", "123456789012345"])(
    "accepts the phone %j",
    (phone) => {
      expect(validatePersonalData({ ...VALID, phone }).errors).toEqual({});
    },
  );

  it.each([
    ["fewer than 8 digits", "1234567"],
    ["more than 15 digits", "1234567890123456"],
    ["letters", "11 1234 abcd"],
    ["more than 20 characters", "1 2 3 4 5 6 7 8 9 0 1"],
    ["only symbols", "+()-- ()-+"],
  ])("rejects a phone with %s", (_case, phone) => {
    expect(validatePersonalData({ ...VALID, phone }).errors).toEqual({
      phone: PROFILE_MESSAGES.phoneInvalid,
    });
  });
});

describe("parsePreferredCurrency", () => {
  it("accepts a currency the user has an account in", () => {
    expect(parsePreferredCurrency("USD", ["ARS", "USD"])).toBe("USD");
    expect(parsePreferredCurrency("ARS", ["ARS"])).toBe("ARS");
  });

  it.each([
    ["a currency without an account", "USD", ["ARS"]],
    ["an unknown currency", "EUR", ["ARS", "USD"]],
    ["lower case", "usd", ["ARS", "USD"]],
    ["nothing", "", ["ARS"]],
  ] as const)("rejects %s", (_case, value, available) => {
    expect(parsePreferredCurrency(value, available)).toBeNull();
  });
});

describe("validateNewEmail", () => {
  it("normalizes the email", () => {
    expect(validateNewEmail("  Ana@Example.COM ")).toEqual({ value: "ana@example.com" });
  });

  it("requires a valid email", () => {
    expect(validateNewEmail(" ")).toEqual({ value: "", error: PROFILE_MESSAGES.emailEmpty });
    expect(validateNewEmail("ana@")).toEqual({
      value: "ana@",
      error: PROFILE_MESSAGES.emailInvalid,
    });
  });
});

describe("validateAlias", () => {
  it("normalizes the alias", () => {
    expect(validateAlias(" Ana.Perez ")).toEqual({ value: "ana.perez" });
  });

  it("uses the same rule and message as the transfer screen", () => {
    expect(PROFILE_MESSAGES.aliasInvalid).toBe(
      "El alias tiene hasta 40 caracteres: letras sin tildes, números y puntos, con al menos una letra.",
    );
    expect(validateAlias("")).toEqual({ value: "", error: PROFILE_MESSAGES.aliasEmpty });
    for (const alias of ["josé", "123", "a".repeat(41), "ana-perez"]) {
      expect(validateAlias(alias)).toEqual({ value: alias, error: PROFILE_MESSAGES.aliasInvalid });
    }
  });
});
