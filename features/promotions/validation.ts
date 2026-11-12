/**
 * Checks a promotion typed in the admin form. Pure, so the Server Action and
 * its tests agree on every rule.
 */
import { BRAND_NAMES } from "@/features/cards/validation";
import { parseAmountToCents } from "@/features/transfers/amount";
import type { CardBrand } from "@/generated/prisma/client";
import { PROMOTION_CATEGORIES, type PromotionCategory } from "./catalog";

export const BANK_MAX_LENGTH = 60;
export const MERCHANT_MAX_LENGTH = 60;
export const CONDITIONS_MAX_LENGTH = 500;

/** The form's value for a promotion that applies to every card. */
export const EVERY_CARD = "TODAS";

export const PROMOTION_MESSAGES = {
  cardBrand: "Elegí la emisora.",
  merchant: "Ingresá el nombre del comercio.",
  category: "Elegí una categoría.",
  weekdays: "Elegí al menos un día.",
  percent: "Ingresá un porcentaje entero entre 1 y 100.",
  cap: "Ingresá el límite de descuento o marcá Sin límite.",
  minimum: "Ingresá la compra mínima o marcá Sin mínimo.",
  amount: "Ingresá un monto válido, por ejemplo 10.000.",
  date: "Ingresá una fecha válida.",
  dateOrder: "La fecha de fin no puede ser anterior a la de inicio.",
  conditions: "Ingresá la descripción.",
  tooLong: (max: number) => `Usá hasta ${max} caracteres.`,
} as const;

/** The form fields as typed; the form gets them back after a failed submit. */
export type PromotionInput = {
  bank: string;
  /** A `CardBrand` or `EVERY_CARD`. */
  cardBrand: string;
  merchant: string;
  category: string;
  weekdays: string[];
  percent: string;
  cap: string;
  noCap: boolean;
  minimum: string;
  noMinimum: boolean;
  /** `YYYY-MM-DD`. */
  validFrom: string;
  validUntil: string;
  conditions: string;
};

export type PromotionErrors = Partial<
  Record<Exclude<keyof PromotionInput, "noCap" | "noMinimum">, string>
>;

export type ValidPromotion = {
  bank: string | null;
  cardBrand: CardBrand | null;
  merchant: string;
  category: PromotionCategory;
  weekdays: number[];
  percent: number;
  capCents: bigint | null;
  minPurchaseCents: bigint | null;
  validFrom: Date;
  validUntil: Date;
  conditions: string;
};

/** A `YYYY-MM-DD` calendar date as a UTC midnight, or null when impossible. */
function parseDate(raw: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects dates such as 2026-02-31, which Date.UTC rolls over.
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

/** An optional amount: null when its "Sin …" box is checked. */
function parseOptionalAmount(raw: string, none: boolean, missing: string) {
  if (none) return { cents: null };
  if (!raw.trim()) return { error: missing };
  const cents = parseAmountToCents(raw);
  return cents === null ? { error: PROMOTION_MESSAGES.amount } : { cents: BigInt(cents) };
}

export function validatePromotion(
  input: PromotionInput,
): { ok: true; promotion: ValidPromotion } | { ok: false; errors: PromotionErrors } {
  const errors: PromotionErrors = {};

  const bank = input.bank.trim();
  if (bank.length > BANK_MAX_LENGTH) errors.bank = PROMOTION_MESSAGES.tooLong(BANK_MAX_LENGTH);

  const brands = Object.keys(BRAND_NAMES) as CardBrand[];
  const cardBrand = brands.find((brand) => brand === input.cardBrand) ?? null;
  if (!cardBrand && input.cardBrand !== EVERY_CARD) errors.cardBrand = PROMOTION_MESSAGES.cardBrand;

  const merchant = input.merchant.trim();
  if (!merchant) errors.merchant = PROMOTION_MESSAGES.merchant;
  else if (merchant.length > MERCHANT_MAX_LENGTH) {
    errors.merchant = PROMOTION_MESSAGES.tooLong(MERCHANT_MAX_LENGTH);
  }

  const category = PROMOTION_CATEGORIES.find((c) => c === input.category);
  if (!category) errors.category = PROMOTION_MESSAGES.category;

  const days = input.weekdays.map((day) => (/^[1-7]$/.test(day) ? Number(day) : null));
  const weekdays = [...new Set(days)].filter((day) => day !== null).sort((a, b) => a - b);
  if (weekdays.length === 0 || days.includes(null)) errors.weekdays = PROMOTION_MESSAGES.weekdays;

  const percent = /^\d{1,3}$/.test(input.percent.trim()) ? Number(input.percent.trim()) : 0;
  if (percent < 1 || percent > 100) errors.percent = PROMOTION_MESSAGES.percent;

  const cap = parseOptionalAmount(input.cap, input.noCap, PROMOTION_MESSAGES.cap);
  if (cap.error) errors.cap = cap.error;
  const minimum = parseOptionalAmount(input.minimum, input.noMinimum, PROMOTION_MESSAGES.minimum);
  if (minimum.error) errors.minimum = minimum.error;

  const validFrom = parseDate(input.validFrom);
  if (!validFrom) errors.validFrom = PROMOTION_MESSAGES.date;
  const validUntil = parseDate(input.validUntil);
  if (!validUntil) errors.validUntil = PROMOTION_MESSAGES.date;
  else if (validFrom && validUntil < validFrom) errors.validUntil = PROMOTION_MESSAGES.dateOrder;

  const conditions = input.conditions.trim();
  if (!conditions) errors.conditions = PROMOTION_MESSAGES.conditions;
  else if (conditions.length > CONDITIONS_MAX_LENGTH) {
    errors.conditions = PROMOTION_MESSAGES.tooLong(CONDITIONS_MAX_LENGTH);
  }

  if (Object.keys(errors).length > 0 || !category || !validFrom || !validUntil) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    promotion: {
      bank: bank || null,
      cardBrand,
      merchant,
      category,
      weekdays,
      percent,
      capCents: cap.cents ?? null,
      minPurchaseCents: minimum.cents ?? null,
      validFrom,
      validUntil,
      conditions,
    },
  };
}
