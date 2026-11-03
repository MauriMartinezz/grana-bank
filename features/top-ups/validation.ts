/**
 * Top-up checks: SUBE numbers, nicknames, Argentine phone numbers, DirecTV
 * accounts and the amount range. Pure and free of server imports, so the
 * forms use the same rules while the user types.
 */
import { parseAmountToCents } from "@/features/transfers/amount";

export type TopUpKind = "SUBE" | "PHONE" | "DIRECTV";
export type TopUpProvider = "SUBE" | "PERSONAL" | "MOVISTAR" | "CLARO" | "TUENTI" | "DIRECTV";

/** $100 to $50.000 per top-up, in cents. */
export const MIN_TOP_UP_CENTS = 10_000;
export const MAX_TOP_UP_CENTS = 5_000_000;

export const NICKNAME_MAX_LENGTH = 40;

export const PROVIDER_NAMES: Record<TopUpProvider, string> = {
  SUBE: "SUBE",
  PERSONAL: "Personal",
  MOVISTAR: "Movistar",
  CLARO: "Claro",
  TUENTI: "Tuenti",
  DIRECTV: "DirecTV",
};

/** The providers of each kind, in display order. */
export const PROVIDERS_BY_KIND: Record<TopUpKind, readonly TopUpProvider[]> = {
  SUBE: ["SUBE"],
  PHONE: ["PERSONAL", "MOVISTAR", "CLARO", "TUENTI"],
  DIRECTV: ["DIRECTV"],
};

export const MESSAGES = {
  subeEmpty: "Ingresá el número de la tarjeta SUBE.",
  subeInvalid: "El número SUBE tiene 16 dígitos y empieza con 6061.",
  nicknameEmpty: "Poné un nombre para reconocer la tarjeta.",
  nicknameTooLong: `El nombre tiene hasta ${NICKNAME_MAX_LENGTH} caracteres.`,
  phoneEmpty: "Ingresá el número de teléfono.",
  phoneInvalid: "Ingresá un número de Argentina con código de área, por ejemplo 11 1234 5678.",
  directvEmpty: "Ingresá el número de cliente de DirecTV.",
  directvInvalid: "El número de cliente tiene de 8 a 12 dígitos.",
  providerInvalid: "Elegí la compañía.",
  amountEmpty: "Ingresá cuánto querés cargar.",
  amountInvalid: "Ingresá un monto válido, por ejemplo 1.500 o 2.000,50.",
  amountRange: "El mínimo es $100 y el máximo $50.000.",
} as const;

export function isTopUpKind(value: unknown): value is TopUpKind {
  return value === "SUBE" || value === "PHONE" || value === "DIRECTV";
}

/** Whether `provider` is one of the providers of `kind`. */
export function isProviderOf(kind: TopUpKind, provider: unknown): provider is TopUpProvider {
  return (PROVIDERS_BY_KIND[kind] as readonly unknown[]).includes(provider);
}

/** 16 digits starting with 6061, typed with or without spaces; null otherwise. */
export function normalizeSubeNumber(raw: string): string | null {
  const digits = raw.replace(/\s/g, "");
  return /^6061\d{12}$/.test(digits) ? digits : null;
}

/** Groups by four while typing: `6061 1234 5678 9012`. */
export function formatSubeNumber(partial: string) {
  const digits = partial.replace(/\D/g, "").slice(0, 16);
  return (digits.match(/.{1,4}/g) ?? []).join(" ");
}

/** The last four digits behind dots: `···· 4321`. */
export function maskDigits(digits: string) {
  return `···· ${digits.slice(-4)}`;
}

export function normalizeNickname(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateNickname(
  raw: string,
): { ok: true; nickname: string } | { ok: false; error: string } {
  const nickname = normalizeNickname(raw);
  if (!nickname) return { ok: false, error: MESSAGES.nicknameEmpty };
  if (nickname.length > NICKNAME_MAX_LENGTH) return { ok: false, error: MESSAGES.nicknameTooLong };
  return { ok: true, nickname };
}

export type SubeCardErrors = { number?: string; nickname?: string };

export function validateSubeCard(input: {
  number: string;
  nickname: string;
}):
  | { ok: true; card: { number: string; nickname: string } }
  | { ok: false; errors: SubeCardErrors } {
  const number = normalizeSubeNumber(input.number);
  const nickname = validateNickname(input.nickname);
  const errors: SubeCardErrors = {};
  if (!number) errors.number = input.number.trim() ? MESSAGES.subeInvalid : MESSAGES.subeEmpty;
  if (!nickname.ok) errors.nickname = nickname.error;
  if (!number || !nickname.ok) return { ok: false, errors };
  return { ok: true, card: { number, nickname: nickname.nickname } };
}

/**
 * An Argentine number as its 10-digit national number, or null.
 *
 * Accepted: spaces, dashes and parentheses anywhere; an optional `+54` (or
 * `54` before at least 10 more digits) and then an optional mobile `9`; or,
 * without a country code, the trunk `0` and the legacy `15` after the area
 * code (`011 15 1234 5678`). The `15` is removed only from a 12-digit number,
 * where it is unambiguous: 11 is the only 2-digit area code, so after `11`
 * it sits at position 2, and otherwise at position 3 (3-digit area code) or 4
 * (4-digit area code), which cannot both start with `15`. A number typed with
 * `15` and no area code is not recognized. The result must be exactly 10
 * digits not starting with 0.
 */
export function normalizePhone(raw: string): string | null {
  const compact = raw.replace(/[\s()-]/g, "");
  if (!/^\+?\d+$/.test(compact)) return null;

  let digits: string;
  let local: boolean;
  if (compact.startsWith("+")) {
    if (!compact.startsWith("+54")) return null;
    digits = compact.slice(3);
    local = false;
  } else if (compact.startsWith("54") && compact.length >= 12) {
    // National numbers never start with 5, so this is the country code.
    digits = compact.slice(2);
    local = false;
  } else {
    digits = compact;
    local = true;
  }

  if (digits.length === 11 && digits.startsWith("9")) digits = digits.slice(1);
  if (local && digits.startsWith("0")) digits = digits.slice(1);
  if (local && digits.length === 12) digits = withoutLegacy15(digits) ?? digits;

  return /^[1-9]\d{9}$/.test(digits) ? digits : null;
}

function withoutLegacy15(digits: string): string | null {
  const areaLengths = digits.startsWith("11") ? [2] : [3, 4];
  const at = areaLengths.filter((length) => digits.slice(length, length + 2) === "15");
  if (at.length !== 1) return null;
  return digits.slice(0, at[0]) + digits.slice(at[0] + 2);
}

/**
 * A normalized number for display. Area code 11 reads `+54 11 1234 5678`;
 * any other reads `+54 351 123 4567`, also for 4-digit area codes, because
 * telling 3- from 4-digit codes apart needs the full numbering plan.
 */
export function formatPhone(national: string) {
  if (national.startsWith("11")) {
    return `+54 11 ${national.slice(2, 6)} ${national.slice(6)}`;
  }
  return `+54 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

/** 8 to 12 digits, typed with spaces or dashes; null otherwise. */
export function normalizeDirectvAccount(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{8,12}$/.test(digits) ? digits : null;
}

export function isTopUpAmount(cents: number) {
  return Number.isSafeInteger(cents) && cents >= MIN_TOP_UP_CENTS && cents <= MAX_TOP_UP_CENTS;
}

/** A typed amount in the Argentine format, checked against the range. */
export function parseTopUpAmount(raw: string): { ok: true; cents: number } | { ok: false; error: string } {
  if (!raw.trim()) return { ok: false, error: MESSAGES.amountEmpty };
  // Below one million, so a valid amount is never rejected as too large here.
  const cents = parseAmountToCents(raw);
  if (cents === null) return { ok: false, error: MESSAGES.amountInvalid };
  if (!isTopUpAmount(cents)) return { ok: false, error: MESSAGES.amountRange };
  return { ok: true, cents };
}
