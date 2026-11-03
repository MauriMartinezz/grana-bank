const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Checked before the pattern, which takes quadratic time on crafted input.
const MAX_EMAIL_LENGTH = 254;

/** Emails are stored trimmed and in lower case. */
export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}
