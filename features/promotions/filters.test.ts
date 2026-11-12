import { describe, expect, it } from "vitest";
import {
  buenosAiresWeekday,
  cardText,
  daysText,
  discountText,
  filterByCard,
  minimumText,
  heldBrands,
  promotionsHref,
  readCardFilter,
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

  it("says when the discount has no cap", () => {
    expect(discountText(10, null)).toBe("10% sin límite");
  });

  it("writes the minimum purchase only when there is one", () => {
    expect(minimumText(BigInt(3_000_000))).toBe("Compra mínima $30.000");
    expect(minimumText(null)).toBeNull();
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

  it("adds the card only when one is selected", () => {
    expect(promotionsHref("lunes", "CINE", "VISA")).toBe(
      "/promociones?dia=lunes&categoria=cine&tarjeta=visa",
    );
    expect(promotionsHref("todos", null, null)).toBe("/promociones?dia=todos");
  });

  it("keeps the day and category filters unchanged next to a card", () => {
    const url = new URL(promotionsHref("sabado", "FARMACIA", "AMEX"), "http://localhost");
    const params = Object.fromEntries(url.searchParams);
    expect(readPromotionFilters(params, 1)).toEqual({
      day: "sabado",
      weekday: 6,
      category: "FARMACIA",
    });
    expect(readCardFilter(params.tarjeta, ["AMEX"])).toBe("AMEX");
  });

  it("round-trips through readPromotionFilters", () => {
    const url = new URL(promotionsHref("sabado", "FARMACIA"), "http://localhost");
    expect(
      readPromotionFilters(Object.fromEntries(url.searchParams), 1),
    ).toEqual({ day: "sabado", weekday: 6, category: "FARMACIA" });
  });
});

describe("card filter", () => {
  it("offers each brand the user holds once, in a stable order", () => {
    const accounts = [
      { cards: [{ brand: "AMEX" as const }, { brand: "VISA" as const }] },
      { cards: [{ brand: "VISA" as const }] },
      { cards: [] },
    ];
    expect(heldBrands(accounts)).toEqual(["VISA", "AMEX"]);
    expect(heldBrands([])).toEqual([]);
  });

  it("reads a held brand from the URL and every card otherwise", () => {
    expect(readCardFilter("visa", ["VISA", "AMEX"])).toBe("VISA");
    expect(readCardFilter("mastercard", ["VISA"])).toBeNull();
    expect(readCardFilter("nada", ["VISA"])).toBeNull();
    expect(readCardFilter(undefined, ["VISA"])).toBeNull();
    expect(readCardFilter(["visa", "amex"], ["VISA", "AMEX"])).toBeNull();
  });

  it("keeps the promotions of the brand and those for every card", () => {
    const rows = [
      { id: "visa", cardBrand: "VISA" as const },
      { id: "amex", cardBrand: "AMEX" as const },
      { id: "any", cardBrand: null },
    ];
    expect(filterByCard(rows, "VISA").map((row) => row.id)).toEqual(["visa", "any"]);
    expect(filterByCard(rows, null)).toEqual(rows);
  });
});

describe("validityText", () => {
  it("names the last day without shifting it", () => {
    expect(validityText(new Date("2026-12-31T00:00:00Z"))).toBe("Hasta el 31 de diciembre");
  });
});
