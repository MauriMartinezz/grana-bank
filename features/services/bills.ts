/**
 * Simulated bills. No company is contacted: each adhesion gets the bills of
 * the previous and the current month, with an amount and a due date derived
 * from the company, the payment number and the month, so the same adhesion
 * always shows the same bills. Relative imports only: the seed uses it too.
 */
import { createHash } from "node:crypto";
import { COMPANY_INFO, type ServiceCompany } from "./companies";
import { buenosAiresDate } from "./due-date";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Whole units of the company's currency: $8.000 to $60.000, or USD 40 to 250. */
const AMOUNT_RANGE = { ARS: { min: 8_000, max: 60_000 }, USD: { min: 40, max: 250 } } as const;
/** Due between the 10th and the 20th of the billed month. */
const FIRST_DUE_DAY = 10;
const LAST_DUE_DAY = 20;

export type SimulatedBill = {
  period: string;
  amountCents: bigint;
  currency: "ARS" | "USD";
  dueDate: Date;
};

/** The billed month as shown: `Noviembre 2026`. `month` goes from 1 to 12. */
export function periodLabel(year: number, month: number) {
  return `${MONTHS[month - 1]} ${year}`;
}

function billFor(company: ServiceCompany, paymentNumber: string, year: number, month: number) {
  const hash = createHash("sha256").update(`${company}:${paymentNumber}:${year}-${month}`).digest();
  const { currency } = COMPANY_INFO[company];
  const { min, max } = AMOUNT_RANGE[currency];
  const units = min + (hash.readUInt32BE(0) % (max - min + 1));
  const day = FIRST_DUE_DAY + (hash.readUInt32BE(4) % (LAST_DUE_DAY - FIRST_DUE_DAY + 1));
  return {
    period: periodLabel(year, month),
    amountCents: BigInt(units) * BigInt(100),
    currency,
    dueDate: new Date(Date.UTC(year, month - 1, day)),
  };
}

/** The previous and the current month's bills, in that order. */
export function simulatedBills(
  company: ServiceCompany,
  paymentNumber: string,
  now: Date = new Date(),
): SimulatedBill[] {
  const { year, month } = buenosAiresDate(now);
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  return [
    billFor(company, paymentNumber, previous.year, previous.month),
    billFor(company, paymentNumber, year, month),
  ];
}

type OrderableBill = { status: "PENDING" | "PAID"; dueDate: Date; paidAt: Date | null };

/** Pending bills first, the soonest due on top; then paid ones, newest first. */
export function orderBills<T extends OrderableBill>(bills: T[]): T[] {
  const pending = bills
    .filter((bill) => bill.status === "PENDING")
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const paid = bills
    .filter((bill) => bill.status === "PAID")
    .sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0));
  return [...pending, ...paid];
}
