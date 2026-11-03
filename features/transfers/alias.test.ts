import { describe, expect, it } from "vitest";
import { isValidAlias, MAX_ALIAS_LENGTH, normalizeAlias } from "./alias";

describe("normalizeAlias", () => {
  it("trims and lower-cases, so case never makes two aliases different", () => {
    expect(normalizeAlias("  Juan.PEREZ ")).toBe("juan.perez");
    expect(normalizeAlias("juan.perez")).toBe(normalizeAlias("JUAN.PEREZ"));
  });
});

describe("isValidAlias", () => {
  it.each([
    "juan.perez",
    "granate",
    "a",
    "juan.123",
    "1a",
    "...a...",
    "a".repeat(MAX_ALIAS_LENGTH),
  ])("accepts %j", (alias) => {
    expect(isValidAlias(alias)).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["longer than 40 characters", "a".repeat(MAX_ALIAS_LENGTH + 1)],
    ["a comma", "juan,perez"],
    ["an accent", "josé.suárez"],
    ["an ñ", "muñoz"],
    ["a hyphen", "juan-perez"],
    ["an underscore", "juan_perez"],
    ["a space", "juan perez"],
    ["an at sign", "juan@perez"],
    ["only digits", "123456"],
    ["only digits and dots", "12.34"],
    ["only dots", "..."],
  ])("rejects %s", (_case, alias) => {
    expect(isValidAlias(alias)).toBe(false);
  });

  it("expects a normalized alias, as stored", () => {
    expect(isValidAlias("Juan.Perez")).toBe(false);
    expect(isValidAlias(normalizeAlias("Juan.Perez"))).toBe(true);
  });
});
