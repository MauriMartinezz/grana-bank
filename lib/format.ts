// Argentine separators: dots for thousands, a comma for decimals.
const LOCALE_MONEY = "es-AR";
const LOCALE_DATE = "es-AR";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

const HUNDRED = BigInt(100);

// Pesos are the app's default currency, so they keep the bare symbol.
const PREFIX: Record<string, string> = { ARS: "$", USD: "USD$" };

// Whole units only: Intl formats a bigint exactly, so the cents are joined
// apart and a balance never goes through floating point.
const unitsFormatter = new Intl.NumberFormat(LOCALE_MONEY, { maximumFractionDigits: 0 });

/**
 * Integer cents as `1.234,56`. Whole amounts drop the decimals unless
 * `alwaysCents` is set. Stored amounts are bigint; typed amounts are safe
 * integer numbers, so both take the exact integer path.
 */
function formatCents(cents: number | bigint, alwaysCents: boolean): string {
  if (typeof cents === "number" && (!Number.isSafeInteger(cents) || Object.is(cents, -0))) {
    // Not integer cents (or -0): keep the plain number behaviour.
    return new Intl.NumberFormat(LOCALE_MONEY, {
      minimumFractionDigits: alwaysCents || cents % 100 !== 0 ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  }
  const value = BigInt(cents);
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const rest = absolute % HUNDRED;
  const units = unitsFormatter.format(absolute / HUNDRED);
  const decimals =
    alwaysCents || rest !== BigInt(0) ? `,${String(rest).padStart(2, "0")}` : "";
  return `${negative ? "-" : ""}${units}${decimals}`;
}

function prefixOf(currency: string) {
  return PREFIX[currency] ?? `${currency}$`;
}

/** Formats an amount: `$5.000` for pesos, `USD$12,50` for dollars. */
export function formatMoney(cents: number | bigint, currency: string): string {
  return `${prefixOf(currency)}${formatCents(cents, false)}`;
}

/** Formats a balance without currency symbol: always two decimals. */
export function formatAmount(cents: number | bigint): string {
  return formatCents(cents, true);
}

/** A balance with its currency and always two decimals: `$1.000,00`. */
export function formatBalance(cents: number | bigint, currency: string): string {
  return `${prefixOf(currency)}${formatAmount(cents)}`;
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE_DATE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

export function formatDateTime(date: Date): string {
  return dateFormatter.format(date);
}

const dayFormatter = new Intl.DateTimeFormat(LOCALE_DATE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

/** The calendar date alone: `9 de marzo de 2026`. */
export function formatDate(date: Date): string {
  return dayFormatter.format(date);
}
