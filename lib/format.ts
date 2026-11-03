// Argentine separators: dots for thousands, a comma for decimals.
const LOCALE_MONEY = "es-AR";
const LOCALE_DATE = "es-AR";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

const HUNDRED = 100;

// Pesos are the app's default currency, so they keep the bare symbol.
const PREFIX: Record<string, string> = { ARS: "$", USD: "USD$" };

/** Formats an amount: `$5.000` for pesos, `USD$12,50` for dollars. */
export function formatMoney(cents: number, currency: string): string {
  const hasCents = cents % HUNDRED !== 0;
  const number = new Intl.NumberFormat(LOCALE_MONEY, {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / HUNDRED);
  return `${PREFIX[currency] ?? `${currency}$`}${number}`;
}

/** Formats a balance without currency symbol: the card shows it apart. */
export function formatAmount(cents: number): string {
  return new Intl.NumberFormat(LOCALE_MONEY, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / HUNDRED);
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
