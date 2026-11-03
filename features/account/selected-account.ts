import type { Currency } from "@/generated/prisma/client";

type UrlParam = string | string[] | undefined;

/** The value of `?cuenta=` that selects the account in this currency. */
export function accountParam(currency: Currency): string {
  return currency.toLowerCase();
}

/**
 * The account Home shows. The URL is user input: an unknown currency, or one
 * the user has no account in, falls back to the preferred currency and then
 * to the first account.
 */
export function pickSelectedAccount<T extends { currency: Currency }>(
  accounts: readonly T[],
  param: UrlParam,
  preferredCurrency: Currency,
): T | undefined {
  const requested = (Array.isArray(param) ? param[0] : param)?.toUpperCase();
  return (
    accounts.find((a) => a.currency === requested) ??
    accounts.find((a) => a.currency === preferredCurrency) ??
    accounts[0]
  );
}
