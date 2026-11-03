/** Simulated rate in whole pesos per dollar, for buying and selling alike. */
export const ARS_PER_USD = 1500;

/**
 * Largest single exchange: ten thousand dollars, in cents. A per-operation
 * limit of the product; balances are 64-bit, so it is not an overflow guard.
 */
export const MAX_EXCHANGE_USD_CENTS = 1_000_000;

/** Dollar cents to peso cents at the simulated rate, as an exact bigint. */
export function usdToArsCents(usdCents: number | bigint): bigint {
  return BigInt(usdCents) * BigInt(ARS_PER_USD);
}

/** A positive whole number of dollar cents within the per-operation limit. */
export function isExchangeAmount(usdCents: number) {
  return Number.isSafeInteger(usdCents) && usdCents > 0 && usdCents <= MAX_EXCHANGE_USD_CENTS;
}
