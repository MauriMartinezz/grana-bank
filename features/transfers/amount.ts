/** Largest single transfer: one million, in cents. */
export const MAX_TRANSFER_CENTS = 100_000_000;

// Argentine format everywhere, also for dollars: whole units either as plain
// digits or with dots grouping thousands, then an optional comma with one or
// two decimals. A dot is never a decimal point, so "12.5" is rejected rather
// than read as 12,50 or 125. A grouped amount never starts with 0, so "0.500"
// (an old dot-decimal habit for fifty cents) is rejected instead of read as 500.
const AMOUNT_PATTERN = /^(\d{1,15}|[1-9]\d{0,2}(?:\.\d{3}){1,4})(?:,(\d{1,2}))?$/;

/**
 * Turns a typed amount into integer cents without floating point.
 * Returns null when the text is not a positive amount within the limit.
 */
export function parseAmountToCents(input: string): number | null {
  const match = AMOUNT_PATTERN.exec(input.trim());
  if (!match) return null;

  const [, units, decimals = ""] = match;
  const cents = Number(units.replaceAll(".", "")) * 100 + Number(decimals.padEnd(2, "0"));

  return cents > 0 && cents <= MAX_TRANSFER_CENTS ? cents : null;
}
