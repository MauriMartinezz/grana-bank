import { isValidEmail, normalizeEmail } from "@/features/auth/email";
import { isValidAlias, normalizeAlias } from "@/features/transfers/alias";
import type { Currency } from "@/generated/prisma/enums";

const MAX_NAME_LENGTH = 50;
const MAX_ADDRESS_LENGTH = 120;
const PHONE_LENGTH = { min: 8, max: 20 };
const PHONE_DIGITS = { min: 8, max: 15 };
const PASSWORD_LENGTH = { min: 8, max: 128 };

// Letters of any language (accents and ñ included), spaces, apostrophes and
// hyphens, with at least one letter.
const NAME_PATTERN = /^[\p{L}\p{M}' ’-]+$/u;
const HAS_LETTER = /\p{L}/u;
const PHONE_PATTERN = /^[\d +()-]+$/;

const CURRENCIES: readonly Currency[] = ["ARS", "USD"];

export const PROFILE_MESSAGES = {
  firstNameEmpty: "Ingresá tu nombre.",
  firstNameInvalid:
    "El nombre tiene hasta 50 caracteres: letras, espacios, apóstrofos y guiones.",
  lastNameEmpty: "Ingresá tu apellido.",
  lastNameInvalid:
    "El apellido tiene hasta 50 caracteres: letras, espacios, apóstrofos y guiones.",
  addressTooLong: "La dirección tiene hasta 120 caracteres.",
  phoneInvalid:
    "El teléfono tiene de 8 a 15 números. Podés usar espacios, +, - y paréntesis.",
  currencyInvalid: "Elegí una moneda en la que tengas cuenta.",
  emailEmpty: "Ingresá tu nuevo email.",
  emailInvalid: "Ingresá un email válido.",
  emailSame: "Ese ya es tu email.",
  emailTaken: "Ese email ya está en uso.",
  passwordEmpty: "Ingresá tu contraseña actual.",
  passwordWrong: "La contraseña no es correcta.",
  currentPasswordWrong: "La contraseña actual no es correcta.",
  newPasswordShort: "La nueva contraseña tiene que tener al menos 8 caracteres.",
  newPasswordLong: "La nueva contraseña tiene hasta 128 caracteres.",
  newPasswordSame: "La nueva contraseña tiene que ser distinta de la actual.",
  passwordMismatch: "Las contraseñas no coinciden.",
  aliasEmpty: "Ingresá un alias.",
  aliasInvalid:
    "El alias tiene hasta 40 caracteres: letras sin tildes, números y puntos, con al menos una letra.",
  aliasTaken: "Ese alias ya está en uso.",
  accountNotFound: "Esta cuenta ya no está disponible.",
} as const;

// The one-time confirmation each change screen leaves on the Perfil summary,
// keyed by the `guardado` search param it redirects with.
const SAVED_MESSAGES = {
  datos: "Guardamos tus datos.",
  email: "Guardamos tu email.",
  alias: "Guardamos tu alias.",
  contrasena: "Cambiamos tu contraseña.",
  moneda: "Guardamos tu moneda preferida.",
} as const;

export type SavedKey = keyof typeof SAVED_MESSAGES;

/** Where a change screen goes after saving: the summary with its confirmation. */
export function profileSavedPath(key: SavedKey) {
  return `/perfil?guardado=${key}`;
}

/** The confirmation for a `guardado` search param, or null for anything else. */
export function savedMessage(value: unknown): string | null {
  return typeof value === "string" && Object.hasOwn(SAVED_MESSAGES, value)
    ? SAVED_MESSAGES[value as SavedKey]
    : null;
}

export type PersonalData = {
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
};
export type PersonalDataErrors = Partial<Record<keyof PersonalData, string>>;

function clean(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function isValidName(name: string) {
  return name.length <= MAX_NAME_LENGTH && NAME_PATTERN.test(name) && HAS_LETTER.test(name);
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").length;
  return (
    PHONE_PATTERN.test(phone) &&
    phone.length >= PHONE_LENGTH.min &&
    phone.length <= PHONE_LENGTH.max &&
    digits >= PHONE_DIGITS.min &&
    digits <= PHONE_DIGITS.max
  );
}

/** Returns the cleaned values, which are what gets stored, and one error per field. */
export function validatePersonalData(input: PersonalData) {
  const values: PersonalData = {
    firstName: clean(input.firstName),
    lastName: clean(input.lastName),
    address: clean(input.address),
    phone: clean(input.phone),
  };
  const errors: PersonalDataErrors = {};

  if (!values.firstName) errors.firstName = PROFILE_MESSAGES.firstNameEmpty;
  else if (!isValidName(values.firstName)) errors.firstName = PROFILE_MESSAGES.firstNameInvalid;

  if (!values.lastName) errors.lastName = PROFILE_MESSAGES.lastNameEmpty;
  else if (!isValidName(values.lastName)) errors.lastName = PROFILE_MESSAGES.lastNameInvalid;

  if (values.address.length > MAX_ADDRESS_LENGTH) {
    errors.address = PROFILE_MESSAGES.addressTooLong;
  }
  if (values.phone && !isValidPhone(values.phone)) {
    errors.phone = PROFILE_MESSAGES.phoneInvalid;
  }

  return { values, errors };
}

/** The currency, when it is one the user has an account in; null otherwise. */
export function parsePreferredCurrency(
  value: string,
  available: readonly Currency[],
): Currency | null {
  const currency = CURRENCIES.find((c) => c === value);
  return currency && available.includes(currency) ? currency : null;
}

export function validateNewEmail(input: string): { value: string; error?: string } {
  const value = normalizeEmail(input);
  if (!value) return { value, error: PROFILE_MESSAGES.emailEmpty };
  if (!isValidEmail(value)) return { value, error: PROFILE_MESSAGES.emailInvalid };
  return { value };
}

export function validateAlias(input: string): { value: string; error?: string } {
  const value = normalizeAlias(input);
  if (!value) return { value, error: PROFILE_MESSAGES.aliasEmpty };
  if (!isValidAlias(value)) return { value, error: PROFILE_MESSAGES.aliasInvalid };
  return { value };
}

export type NewPasswordErrors = { next?: string; confirmation?: string };

/** Length and confirmation rules; comparing with the current one needs the database. */
export function validateNewPassword(next: string, confirmation: string): NewPasswordErrors {
  const errors: NewPasswordErrors = {};
  if (next.length < PASSWORD_LENGTH.min) errors.next = PROFILE_MESSAGES.newPasswordShort;
  else if (next.length > PASSWORD_LENGTH.max) errors.next = PROFILE_MESSAGES.newPasswordLong;
  else if (confirmation !== next) errors.confirmation = PROFILE_MESSAGES.passwordMismatch;
  return errors;
}
