import { describe, expect, it } from "vitest";
import { isValidAlias } from "./alias";
import { ALIAS_WORDS, generateAlias } from "./alias-generator";

describe("generateAlias", () => {
  it("joins three pronounceable words with dots", () => {
    const alias = generateAlias();
    const words = alias.split(".");

    expect(words).toHaveLength(3);
    for (const word of words) expect(ALIAS_WORDS).toContain(word);
  });

  it("always fits the alias rule", () => {
    for (let i = 0; i < 500; i++) expect(isValidAlias(generateAlias())).toBe(true);
  });

  it("picks words with the given random source", () => {
    const picks = [0, 1, 2];
    const alias = generateAlias(() => picks.shift()!);
    expect(alias).toBe(ALIAS_WORDS.slice(0, 3).join("."));
  });

  it("varies between calls", () => {
    const aliases = new Set(Array.from({ length: 50 }, () => generateAlias()));
    expect(aliases.size).toBeGreaterThan(40);
  });
});

describe("ALIAS_WORDS", () => {
  it("holds only short lowercase words without accents, each once", () => {
    expect(ALIAS_WORDS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(ALIAS_WORDS).size).toBe(ALIAS_WORDS.length);
    for (const word of ALIAS_WORDS) expect(word).toMatch(/^[a-z]{2,10}$/);
  });
});

describe("pronounceable aliases migration", () => {
  it("uses the same word list as the generator", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync(
      "prisma/migrations/20261103200000_pronounceable_aliases/migration.sql",
      "utf8",
    );
    const list = /ARRAY\[([^\]]+)\]/.exec(sql)![1];
    const words = list.split(",").map((word) => word.trim().replaceAll("'", ""));
    expect(words).toEqual(ALIAS_WORDS);
  });
});
