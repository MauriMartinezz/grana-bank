/** Simulated rate in whole pesos per dollar, for buying and selling alike. */
export const ARS_PER_USD = 1500;

/**
 * Largest single exchange: ten thousand dollars, in cents. Its peso side
 * (15 million pesos) still fits the 32-bit integer balances are stored in.
 */
export const MAX_EXCHANGE_USD_CENTS = 1_000_000;

/** Dollar cents to peso cents at the simulated rate, in integers only. */
export function usdToArsCents(usdCents: number) {
  return usdCents * ARS_PER_USD;
}

/** A positive whole number of dollar cents within the per-operation limit. */
export function isExchangeAmount(usdCents: number) {
  return Number.isSafeInteger(usdCents) && usdCents > 0 && usdCents <= MAX_EXCHANGE_USD_CENTS;
}
