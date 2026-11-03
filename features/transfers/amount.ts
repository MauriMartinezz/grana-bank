/** Largest single transfer: one million, in cents. */
export const MAX_TRANSFER_CENTS = 100_000_000;

// Whole units, then an optional "." or "," with one or two decimals.
// Thousands separators are rejected, so "1.234" is never read as 1234.
const AMOUNT_PATTERN = /^(\d{1,15})(?:[.,](\d{1,2}))?$/;

/**
 * Turns a typed amount into integer cents without floating point.
 * Returns null when the text is not a positive amount within the limit.
 */
export function parseAmountToCents(input: string): number | null {
  const match = AMOUNT_PATTERN.exec(input.trim());
  if (!match) return null;

  const [, units, decimals = ""] = match;
  const cents = Number(units) * 100 + Number(decimals.padEnd(2, "0"));

  return cents > 0 && cents <= MAX_TRANSFER_CENTS ? cents : null;
}
