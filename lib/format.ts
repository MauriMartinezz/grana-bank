const LOCALE_MONEY = "en-US";
const LOCALE_DATE = "es-AR";
const TIME_ZONE = "America/Argentina/Buenos_Aires";

const HUNDRED = 100;

/** Formats a movement amount: `$125`, or `$12.99` when it has cents. */
export function formatMoney(cents: number, currency: string): string {
  const hasCents = cents % HUNDRED !== 0;
  return new Intl.NumberFormat(LOCALE_MONEY, {
    style: "currency",
    currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / HUNDRED);
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
