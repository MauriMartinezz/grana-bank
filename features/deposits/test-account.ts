/**
 * The seeded "Cuenta de prueba" that funds deposits. Relative imports only:
 * the seed uses it too.
 */
export const TEST_ACCOUNT = {
  email: "cuenta.prueba@granabank.test",
  firstName: "Cuenta de prueba",
  /** Large enough that the demo never runs it dry: 10.000 million per currency. */
  balanceCents: BigInt(1_000_000_000_000),
  accounts: [
    { currency: "ARS", alias: "cuenta.prueba" },
    { currency: "USD", alias: "cuenta.prueba.usd" },
  ],
} as const;

/** Per deposit: $1.000.000 or USD 10.000. */
export const MAX_DEPOSIT_CENTS = { ARS: 100_000_000, USD: 1_000_000 } as const;

type SearchParam = string | string[] | undefined;

/**
 * Reads the confirmation URL of a deposit, or null when it is invalid and the
 * page sends the user back to the form.
 */
export function readDepositConfirmation(
  currency: SearchParam,
  amount: SearchParam,
  key: SearchParam,
): { currency: "ARS" | "USD"; amountCents: number; idempotencyKey: string } | null {
  if (currency !== "ARS" && currency !== "USD") return null;
  const cents = typeof amount === "string" && /^\d{1,12}$/.test(amount) ? Number(amount) : 0;
  if (cents <= 0 || cents > MAX_DEPOSIT_CENTS[currency]) return null;
  if (
    typeof key !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)
  ) {
    return null;
  }
  return { currency, amountCents: cents, idempotencyKey: key.toLowerCase() };
}
