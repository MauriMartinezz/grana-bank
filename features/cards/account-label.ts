import type { Currency } from "@/generated/prisma/enums";

/** How an account is named on the card screens. */
export const ACCOUNT_LABELS: Record<Currency, string> = {
  ARS: "Cuenta en pesos",
  USD: "Cuenta en dólares",
};
