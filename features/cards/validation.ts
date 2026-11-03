/**
 * Local card checks: brand by prefix, length per brand, Luhn checksum, expiry
 * and security code. Pure and free of server imports, so the form uses the
 * same rules to show the brand while the number is typed.
 */

export type CardBrand = "VISA" | "MASTERCARD" | "AMEX";

export type CardInput = {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
};

/** What a card face shows: the only card data the app stores. */
export type CardFace = {
  brand: CardBrand;
  last4: string;
  holder: string;
  expiry: string;
};

export type CardErrors = Partial<Record<keyof CardInput, string>>;

export type CardValidation =
  | { ok: true; card: CardFace }
  | { ok: false; errors: CardErrors; brand: CardBrand | null };

export const BRAND_NAMES: Record<CardBrand, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  AMEX: "American Express",
};

const LENGTHS: Record<CardBrand, readonly number[]> = {
  VISA: [13, 16, 19],
  MASTERCARD: [16],
  AMEX: [15],
};

const CVV_LENGTH: Record<CardBrand, number> = { VISA: 3, MASTERCARD: 3, AMEX: 4 };

/** The card-face limit for the embossed name (ISO/IEC 7813). */
export const HOLDER_MAX_LENGTH = 26;

export const MESSAGES = {
  numberEmpty: "Ingresá el número de tarjeta.",
  numberInvalid: "El número de tarjeta no es válido.",
  brandUnsupported: "Solo aceptamos Visa, Mastercard o American Express.",
  holderEmpty: "Ingresá el nombre como figura en la tarjeta.",
  holderInvalid: "El nombre solo puede tener letras y espacios.",
  holderTooLong: `El nombre tiene hasta ${HOLDER_MAX_LENGTH} caracteres.`,
  expiryEmpty: "Ingresá la fecha de vencimiento.",
  expiryFormat: "Ingresá el vencimiento como MM/AA.",
  expiryMonth: "El mes de vencimiento no es válido.",
  expired: "La tarjeta está vencida.",
  cvvEmpty: "Ingresá el código de seguridad.",
  cvvInvalid: "El código de seguridad no es válido.",
} as const;

export function normalizeCardNumber(raw: string) {
  return raw.replace(/[\s-]/g, "");
}

/**
 * The brand of a complete or partial number, from its prefix only. Returns
 * null until the prefix is enough to tell, and for any other brand.
 */
export function detectBrand(partialNumber: string): CardBrand | null {
  const digits = normalizeCardNumber(partialNumber);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("4")) return "VISA";
  if (/^3[47]/.test(digits)) return "AMEX";
  if (/^5[1-5]/.test(digits)) return "MASTERCARD";
  if (digits.length >= 4) {
    const prefix = Number(digits.slice(0, 4));
    if (prefix >= 2221 && prefix <= 2720) return "MASTERCARD";
  }
  return null;
}

/** Luhn (mod 10) checksum of a string of digits. */
export function isLuhnValid(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return digits.length > 0 && sum % 10 === 0;
}

/** Groups the digits as printed on the card: 4-6-5 for Amex, by 4 otherwise. */
export function formatCardNumber(partialNumber: string) {
  const digits = normalizeCardNumber(partialNumber).replace(/\D/g, "");
  const groups =
    detectBrand(digits) === "AMEX"
      ? [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      : (digits.match(/.{1,4}/g) ?? []);
  return groups.filter(Boolean).join(" ");
}

export function cvvLength(brand: CardBrand | null) {
  return brand ? CVV_LENGTH[brand] : 4;
}

function checkNumber(raw: string, brand: CardBrand | null) {
  const digits = normalizeCardNumber(raw);
  if (!digits) return MESSAGES.numberEmpty;
  if (!/^\d+$/.test(digits)) return MESSAGES.numberInvalid;
  if (!brand) return MESSAGES.brandUnsupported;
  if (!LENGTHS[brand].includes(digits.length) || !isLuhnValid(digits)) {
    return MESSAGES.numberInvalid;
  }
}

export function normalizeHolder(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

function checkHolder(holder: string) {
  if (!holder) return MESSAGES.holderEmpty;
  if (!/^[\p{L} ]+$/u.test(holder)) return MESSAGES.holderInvalid;
  if (holder.length > HOLDER_MAX_LENGTH) return MESSAGES.holderTooLong;
}

// Card months follow the Argentine calendar, not the server's time zone.
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

/** The month of `date` in Buenos Aires, counted as `year * 12 + monthIndex`. */
export function buenosAiresMonth(date: Date) {
  const parts = monthFormatter.formatToParts(date);
  const part = (type: "year" | "month") =>
    Number(parts.find((p) => p.type === type)?.value);
  return part("year") * 12 + (part("month") - 1);
}

/** The expiry month as `year * 12 + monthIndex`, or null when it is not MM/YY. */
function expiryMonth(expiry: string) {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry);
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  return (2000 + Number(match[2])) * 12 + (month - 1);
}

export type ExpiryStatus = "expired" | "expiring" | "valid";

/**
 * Whether a card is past its expiry month, expires in the current or the next
 * month, or later, in the Buenos Aires calendar. Null when not MM/YY.
 */
export function expiryStatus(expiry: string, now: Date = new Date()): ExpiryStatus | null {
  const expires = expiryMonth(expiry);
  if (expires === null) return null;
  const current = buenosAiresMonth(now);
  if (expires < current) return "expired";
  return expires <= current + 1 ? "expiring" : "valid";
}

/** A card is valid through the last day of its expiry month. */
function checkExpiry(expiry: string, now: Date) {
  if (!expiry) return MESSAGES.expiryEmpty;
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return MESSAGES.expiryFormat;
  if (expiryMonth(expiry) === null) return MESSAGES.expiryMonth;
  if (expiryStatus(expiry, now) === "expired") return MESSAGES.expired;
}

function checkCvv(cvv: string, brand: CardBrand | null) {
  if (!cvv) return MESSAGES.cvvEmpty;
  if (!brand) return /^\d{3,4}$/.test(cvv) ? undefined : MESSAGES.cvvInvalid;
  const length = CVV_LENGTH[brand];
  if (!new RegExp(`^\\d{${length}}$`).test(cvv)) {
    return `El código de seguridad tiene ${length} dígitos.`;
  }
}

/**
 * Checks every field and reports each error. On success it returns only the
 * card face: the full number and the security code go no further.
 */
export function validateCard(input: CardInput, now: Date = new Date()): CardValidation {
  const brand = detectBrand(input.number);
  const holder = normalizeHolder(input.holder);
  const expiry = input.expiry.trim();
  const cvv = input.cvv.trim();

  const errors: CardErrors = {};
  const checks = {
    number: checkNumber(input.number, brand),
    holder: checkHolder(holder),
    expiry: checkExpiry(expiry, now),
    cvv: checkCvv(cvv, brand),
  };
  for (const [field, error] of Object.entries(checks)) {
    if (error) errors[field as keyof CardInput] = error;
  }

  if (Object.keys(errors).length > 0 || !brand) return { ok: false, errors, brand };
  const digits = normalizeCardNumber(input.number);
  return { ok: true, card: { brand, last4: digits.slice(-4), holder, expiry } };
}
