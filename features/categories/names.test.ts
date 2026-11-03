import { describe, expect, it } from "vitest";
import {
  categoryKey,
  defaultCategoryRows,
  validateCategoryName,
  validateNote,
} from "./names";

describe("validateCategoryName", () => {
  it("trims, joins spaces and keys the name in lower case", () => {
    expect(validateCategoryName("  Comida   Afuera ")).toEqual({
      ok: true,
      name: "Comida Afuera",
      key: "comida afuera",
    });
  });

  it("keys names that differ only in case the same", () => {
    expect(categoryKey("ALQUILER")).toBe(categoryKey("alquiler"));
    expect(categoryKey("Educación")).toBe(categoryKey("EDUCACIÓN"));
  });

  it("asks for a name and takes up to 30 characters", () => {
    expect(validateCategoryName("   ")).toEqual({
      ok: false,
      error: "Escribí un nombre para la categoría.",
    });
    expect(validateCategoryName("a".repeat(30)).ok).toBe(true);
    expect(validateCategoryName("a".repeat(31))).toEqual({
      ok: false,
      error: "El nombre tiene hasta 30 caracteres.",
    });
  });
});

describe("validateNote", () => {
  it("keeps up to 140 characters and turns an empty note into none", () => {
    expect(validateNote("  Alquiler de noviembre ")).toEqual({
      ok: true,
      note: "Alquiler de noviembre",
    });
    expect(validateNote("   ")).toEqual({ ok: true, note: null });
    expect(validateNote("ñ".repeat(140)).ok).toBe(true);
    expect(validateNote("ñ".repeat(141))).toEqual({
      ok: false,
      error: "La nota tiene hasta 140 caracteres.",
    });
  });
});

describe("normalizeNote", () => {
  it("counts a submitted line break once, as the form's counter does", () => {
    // A form submission turns every line break of a textarea into CRLF.
    const typed = `${"a".repeat(69)}\n${"b".repeat(70)}`;
    const submitted = typed.replace(/\n/g, "\r\n");

    expect(validateNote(submitted)).toEqual({ ok: true, note: typed });
  });
});

describe("defaultCategoryRows", () => {
  it("suggests Alquiler, Comida, Servicios, Regalos and Otros", () => {
    expect(defaultCategoryRows()).toEqual([
      { name: "Alquiler", key: "alquiler" },
      { name: "Comida", key: "comida" },
      { name: "Servicios", key: "servicios" },
      { name: "Regalos", key: "regalos" },
      { name: "Otros", key: "otros" },
    ]);
  });
});
