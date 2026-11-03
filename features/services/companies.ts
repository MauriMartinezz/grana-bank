/**
 * Utility companies and the checks of an adhesion. Pure and free of server
 * imports, so the adhesion form uses the same rules while the user types.
 */
import { NICKNAME_MAX_LENGTH, normalizeNickname } from "@/features/top-ups/validation";

export type ServiceCompany =
  | "AYSA"
  | "EDESUR"
  | "EDENOR"
  | "METROGAS"
  | "SALUD_PLENA"
  | "AUSTRAL_SEGUROS";

export const SERVICE_COMPANIES: readonly ServiceCompany[] = [
  "AYSA",
  "EDESUR",
  "EDENOR",
  "METROGAS",
  "SALUD_PLENA",
  "AUSTRAL_SEGUROS",
];

/**
 * The electronic payment number lengths are simulated: plausible fixed
 * lengths, not the companies' real formats. A database CHECK keeps the same
 * lengths. A company bills in one currency, and its bills are paid from a
 * card of that currency. The dollar companies are fictional, so no real
 * company is shown billing in dollars.
 */
export const COMPANY_INFO: Record<
  ServiceCompany,
  { name: string; service: string; numberLength: number; currency: "ARS" | "USD" }
> = {
  AYSA: { name: "AySA", service: "Agua", numberLength: 10, currency: "ARS" },
  EDESUR: { name: "Edesur", service: "Luz", numberLength: 10, currency: "ARS" },
  EDENOR: { name: "Edenor", service: "Luz", numberLength: 12, currency: "ARS" },
  METROGAS: { name: "Metrogas", service: "Gas", numberLength: 11, currency: "ARS" },
  SALUD_PLENA: { name: "Salud Plena", service: "Prepaga", numberLength: 8, currency: "USD" },
  AUSTRAL_SEGUROS: { name: "Austral Seguros", service: "Seguro", numberLength: 9, currency: "USD" },
};

export { NICKNAME_MAX_LENGTH };

export const MESSAGES = {
  companyInvalid: "Elegí la empresa.",
  numberEmpty: "Ingresá el número de pago electrónico.",
  nicknameEmpty: "Poné un nombre para reconocer el servicio.",
  nicknameTooLong: `El nombre tiene hasta ${NICKNAME_MAX_LENGTH} caracteres.`,
} as const;

export function numberInvalidMessage(company: ServiceCompany) {
  const { name, numberLength } = COMPANY_INFO[company];
  return `El número de pago electrónico de ${name} tiene ${numberLength} dígitos.`;
}

export function isServiceCompany(value: unknown): value is ServiceCompany {
  return (SERVICE_COMPANIES as readonly unknown[]).includes(value);
}

/** The digits of a payment number typed with spaces or dashes, or null. */
export function normalizePaymentNumber(company: ServiceCompany, raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  const { numberLength } = COMPANY_INFO[company];
  return /^\d+$/.test(digits) && digits.length === numberLength ? digits : null;
}

export type AdhesionErrors = { company?: string; paymentNumber?: string; nickname?: string };

export type Adhesion = { company: ServiceCompany; paymentNumber: string; nickname: string };

export function validateAdhesion(input: {
  company: unknown;
  paymentNumber: string;
  nickname: string;
}): { ok: true; adhesion: Adhesion } | { ok: false; errors: AdhesionErrors } {
  const errors: AdhesionErrors = {};
  const company = isServiceCompany(input.company) ? input.company : null;
  if (!company) errors.company = MESSAGES.companyInvalid;

  const paymentNumber = company ? normalizePaymentNumber(company, input.paymentNumber) : null;
  if (!input.paymentNumber.trim()) errors.paymentNumber = MESSAGES.numberEmpty;
  else if (company && !paymentNumber) errors.paymentNumber = numberInvalidMessage(company);

  const nickname = normalizeNickname(input.nickname);
  if (!nickname) errors.nickname = MESSAGES.nicknameEmpty;
  else if (nickname.length > NICKNAME_MAX_LENGTH) errors.nickname = MESSAGES.nicknameTooLong;

  if (!company || !paymentNumber || errors.nickname) return { ok: false, errors };
  return { ok: true, adhesion: { company, paymentNumber, nickname } };
}

/** The company in the adhesion URL: `salud-plena`. */
export function companySlug(company: ServiceCompany): string {
  return company.toLowerCase().replaceAll("_", "-");
}

/** The company of an adhesion URL, or null when the slug is unknown. */
export function companyFromSlug(slug: string): ServiceCompany | null {
  return SERVICE_COMPANIES.find((company) => companySlug(company) === slug) ?? null;
}
