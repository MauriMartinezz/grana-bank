import type { MovementType } from "@/generated/prisma/client";

/**
 * Which way a movement moves money: `income` comes in, `conversion` only
 * turns pesos into dollars or back, and `expense` is everything else that
 * takes money out. The one place that decides it, so a new outgoing type
 * counts as an expense without touching this screen.
 */
export type MoneyFlow = "expense" | "income" | "conversion";

export function moneyFlow(type: MovementType): MoneyFlow {
  switch (type) {
    case "RECEIVED":
      return "income";
    case "EXCHANGE":
      return "conversion";
    default:
      return "expense";
  }
}
