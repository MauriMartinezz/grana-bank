import { describe, expect, it } from "vitest";
import { PROMOTION_MESSAGES, validatePromotion, type PromotionInput } from "./validation";

function input(overrides: Partial<PromotionInput> = {}): PromotionInput {
  return {
    bank: "  Banco Ceibo ",
    cardBrand: "VISA",
    merchant: "  Café Tostado ",
    category: "SUPERMERCADO",
    weekdays: ["5", "1"],
    percent: "15",
    cap: "10.000",
    noCap: false,
    minimum: "30.000",
    noMinimum: false,
    validFrom: "2026-11-01",
    validUntil: "2026-12-31",
    conditions: "  En toda la tienda. ",
    ...overrides,
  };
}

describe("validatePromotion", () => {
  it("accepts every field and turns amounts into cents and dates into UTC midnights", () => {
    expect(validatePromotion(input())).toEqual({
      ok: true,
      promotion: {
        bank: "Banco Ceibo",
        cardBrand: "VISA",
        merchant: "Café Tostado",
        category: "SUPERMERCADO",
        weekdays: [1, 5],
        percent: 15,
        capCents: BigInt(1_000_000),
        minPurchaseCents: BigInt(3_000_000),
        validFrom: new Date("2026-11-01T00:00:00Z"),
        validUntil: new Date("2026-12-31T00:00:00Z"),
        conditions: "En toda la tienda.",
      },
    });
  });

  it("leaves out the bank, the card, the cap and the minimum when asked", () => {
    const result = validatePromotion(
      input({ bank: " ", cardBrand: "TODAS", cap: "", noCap: true, minimum: "", noMinimum: true }),
    );
    expect(result).toMatchObject({
      ok: true,
      promotion: { bank: null, cardBrand: null, capCents: null, minPurchaseCents: null },
    });
  });

  it("ignores a typed amount when Sin límite or Sin mínimo is checked", () => {
    const result = validatePromotion(input({ cap: "abc", noCap: true, minimum: "x", noMinimum: true }));
    expect(result).toMatchObject({ ok: true, promotion: { capCents: null, minPurchaseCents: null } });
  });

  it("reports every missing field in Spanish", () => {
    expect(
      validatePromotion({
        bank: "",
        cardBrand: "",
        merchant: "",
        category: "",
        weekdays: [],
        percent: "",
        cap: "",
        noCap: false,
        minimum: "",
        noMinimum: false,
        validFrom: "",
        validUntil: "",
        conditions: "",
      }),
    ).toEqual({
      ok: false,
      errors: {
        cardBrand: "Elegí la emisora.",
        merchant: "Ingresá el nombre del comercio.",
        category: "Elegí una categoría.",
        weekdays: "Elegí al menos un día.",
        percent: "Ingresá un porcentaje entero entre 1 y 100.",
        cap: "Ingresá el límite de descuento o marcá Sin límite.",
        minimum: "Ingresá la compra mínima o marcá Sin mínimo.",
        validFrom: "Ingresá una fecha válida.",
        validUntil: "Ingresá una fecha válida.",
        conditions: "Ingresá la descripción.",
      },
    });
  });

  it.each(["0", "101", "12,5", "abc", "-5"])("rejects the percent %s", (percent) => {
    expect(validatePromotion(input({ percent }))).toEqual({
      ok: false,
      errors: { percent: PROMOTION_MESSAGES.percent },
    });
  });

  it("accepts the percent limits 1 and 100", () => {
    expect(validatePromotion(input({ percent: "1" }))).toMatchObject({ ok: true });
    expect(validatePromotion(input({ percent: "100" }))).toMatchObject({ ok: true });
  });

  it("rejects malformed amounts", () => {
    expect(validatePromotion(input({ cap: "12.5", minimum: "0" }))).toEqual({
      ok: false,
      errors: { cap: PROMOTION_MESSAGES.amount, minimum: PROMOTION_MESSAGES.amount },
    });
  });

  it("rejects unknown days, cards and categories", () => {
    expect(
      validatePromotion(input({ weekdays: ["0", "8", "lunes"], cardBrand: "DINERS", category: "AUTOS" })),
    ).toEqual({
      ok: false,
      errors: {
        weekdays: PROMOTION_MESSAGES.weekdays,
        cardBrand: PROMOTION_MESSAGES.cardBrand,
        category: PROMOTION_MESSAGES.category,
      },
    });
  });

  it("keeps each day once", () => {
    expect(validatePromotion(input({ weekdays: ["3", "3", "2"] }))).toMatchObject({
      ok: true,
      promotion: { weekdays: [2, 3] },
    });
  });

  it("rejects impossible dates and an end before the start", () => {
    expect(validatePromotion(input({ validFrom: "2026-02-31" }))).toEqual({
      ok: false,
      errors: { validFrom: PROMOTION_MESSAGES.date },
    });
    expect(validatePromotion(input({ validFrom: "2026-12-01", validUntil: "2026-11-30" }))).toEqual({
      ok: false,
      errors: { validUntil: "La fecha de fin no puede ser anterior a la de inicio." },
    });
  });

  it("rejects texts that are too long", () => {
    expect(
      validatePromotion(
        input({ bank: "b".repeat(61), merchant: "m".repeat(61), conditions: "c".repeat(501) }),
      ),
    ).toEqual({
      ok: false,
      errors: {
        bank: "Usá hasta 60 caracteres.",
        merchant: "Usá hasta 60 caracteres.",
        conditions: "Usá hasta 500 caracteres.",
      },
    });
  });
});
