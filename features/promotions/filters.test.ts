import { describe, expect, it } from "vitest";
import {
  buenosAiresWeekday,
  cardText,
  daysText,
  discountText,
  promotionsHref,
  readPromotionFilters,
  validityText,
} from "./filters";

describe("buenosAiresWeekday", () => {
  it("numbers the days from Monday 1 to Sunday 7 in Buenos Aires", () => {
    expect(buenosAiresWeekday(new Date("2026-11-02T15:00:00Z"))).toBe(1); // Monday
    expect(buenosAiresWeekday(new Date("2026-11-08T15:00:00Z"))).toBe(7); // Sunday
    // 01:00 UTC on Tuesday is still Monday night in Buenos Aires.
    expect(buenosAiresWeekday(new Date("2026-11-03T01:00:00Z"))).toBe(1);
  });
});

describe("readPromotionFilters", () => {
  const TUESDAY = 2;

  it("selects today when the URL names no day", () => {
    expect(readPromotionFilters({}, TUESDAY)).toEqual({ day: "martes", weekday: 2, category: null });
  });

  it("reads a day, every day and a category", () => {
    expect(readPromotionFilters({ dia: "viernes", categoria: "cine" }, TUESDAY)).toEqual({
      day: "viernes",
      weekday: 5,
      category: "CINE",
    });
    expect(readPromotionFilters({ dia: "todos" }, TUESDAY)).toEqual({
      day: "todos",
      weekday: null,
      category: null,
    });
  });

  it("falls back to today and every category on unknown or repeated values", () => {
    expect(readPromotionFilters({ dia: "feriado", categoria: "autos" }, TUESDAY)).toEqual({
      day: "martes",
      weekday: 2,
      category: null,
    });
    expect(readPromotionFilters({ dia: ["lunes", "martes"] }, TUESDAY).day).toBe("martes");
  });
});

describe("texts", () => {
  it("writes the discount with its cap", () => {
    expect(discountText(20, BigInt(1_500_000))).toBe("20% hasta $15.000");
  });

  it("names the days, every day and weekends", () => {
    expect(daysText([1, 3])).toBe("Lunes y miércoles");
    expect(daysText([2, 4, 6])).toBe("Martes, jueves y sábados");
    expect(daysText([1, 2, 3, 4, 5, 6, 7])).toBe("Todos los días");
    expect(daysText([5])).toBe("Viernes");
  });

  it("says which cards apply", () => {
    expect(cardText("VISA")).toBe("Solo Visa");
    expect(cardText(null)).toBe("Todas tus tarjetas");
  });
});

describe("promotionsHref", () => {
  it("keeps the day and the category in the URL", () => {
    expect(promotionsHref("lunes", "CINE")).toBe("/promociones?dia=lunes&categoria=cine");
    expect(promotionsHref("todos", null)).toBe("/promociones?dia=todos");
  });

  it("round-trips through readPromotionFilters", () => {
    const url = new URL(promotionsHref("sabado", "FARMACIA"), "http://localhost");
    expect(
      readPromotionFilters(Object.fromEntries(url.searchParams), 1),
    ).toEqual({ day: "sabado", weekday: 6, category: "FARMACIA" });
  });
});

describe("validityText", () => {
  it("names the last day without shifting it", () => {
    expect(validityText(new Date("2026-12-31T00:00:00Z"))).toBe("Hasta el 31 de diciembre");
  });
});
