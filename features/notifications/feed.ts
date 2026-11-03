/**
 * The notifications feed, derived from stored data: nothing in the money
 * flows writes a notification. Pure, so the screen and the bell's unread
 * count agree.
 */
import { daysUntil, dueLabel } from "@/features/services/due-date";
import type {
  Currency,
  ExchangeDirection,
  MovementType,
  ScheduledPaymentFailure,
} from "@/generated/prisma/client";
import { formatMoney } from "@/lib/format";

export const MAX_NOTIFICATIONS = 50;

export type FeedSources = {
  movements: {
    id: string;
    type: MovementType;
    counterparty: string;
    amountCents: bigint;
    currency: Currency;
    occurredAt: Date;
  }[];
  exchanges: {
    id: string;
    direction: ExchangeDirection;
    usdCents: bigint;
    arsCents: bigint;
    createdAt: Date;
    /** The dollar side's movement, to open its detail. */
    movementId: string | null;
  }[];
  failedBills: {
    id: string;
    nickname: string;
    period: string;
    failureReason: ScheduledPaymentFailure | null;
    failedAt: Date | null;
  }[];
  reminderBills: {
    id: string;
    nickname: string;
    period: string;
    amountCents: bigint;
    currency: Currency;
    dueDate: Date;
    reminderDays: number;
  }[];
};

export type NotificationKind = "money-in" | "money-out" | "exchange" | "failure" | "reminder";

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  at: Date;
  href: string;
  unread: boolean;
};

const FAILURE_TEXT: Record<ScheduledPaymentFailure, string> = {
  INSUFFICIENT_FUNDS: "no había saldo suficiente",
  CARD_UNAVAILABLE: "la tarjeta ya no está disponible",
};

// Buenos Aires is UTC-3 all year: its midnight is 03:00 UTC.
const BUENOS_AIRES_MIDNIGHT_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** When a reminder starts: midnight in Buenos Aires, `days` before the due date. */
export function reminderDate(dueDate: Date, days: number): Date {
  return new Date(dueDate.getTime() - days * DAY_MS + BUENOS_AIRES_MIDNIGHT_MS);
}

function movementText(m: FeedSources["movements"][number]) {
  const money = formatMoney(m.amountCents, m.currency);
  switch (m.type) {
    case "RECEIVED":
      return { kind: "money-in" as const, title: `Recibiste ${money}`, detail: `De ${m.counterparty}` };
    case "SENT":
      return { kind: "money-out" as const, title: `Enviaste ${money}`, detail: `A ${m.counterparty}` };
    case "TOP_UP":
      return { kind: "money-out" as const, title: `Recargaste ${money}`, detail: m.counterparty };
    case "SERVICE_PAYMENT":
      return { kind: "money-out" as const, title: `Pagaste ${money}`, detail: m.counterparty };
    case "SUBSCRIPTION":
      return {
        kind: "money-out" as const,
        title: `Se cobró ${money}`,
        detail: `Suscripción a ${m.counterparty}`,
      };
    default:
      // Exchanges come from their own source, one per operation.
      return null;
  }
}

/** Newest first, the newest 50; unread when newer than the last visit. */
export function buildFeed(sources: FeedSources, seenAt: Date | null, now: Date): Notification[] {
  const items: Omit<Notification, "unread">[] = [];

  for (const m of sources.movements) {
    const text = movementText(m);
    if (text) items.push({ id: `movement-${m.id}`, ...text, at: m.occurredAt, href: `/movimientos/${m.id}` });
  }
  for (const e of sources.exchanges) {
    items.push({
      id: `exchange-${e.id}`,
      kind: "exchange",
      title: `${e.direction === "BUY" ? "Compraste" : "Vendiste"} ${formatMoney(e.usdCents, "USD")}`,
      detail: `Por ${formatMoney(e.arsCents, "ARS")}`,
      at: e.createdAt,
      href: e.movementId ? `/movimientos/${e.movementId}` : "/dolares",
    });
  }
  for (const bill of sources.failedBills) {
    if (!bill.failedAt || !bill.failureReason) continue;
    items.push({
      id: `failure-${bill.id}`,
      kind: "failure",
      title: `No pudimos pagar ${bill.nickname}`,
      detail: `${bill.period}: ${FAILURE_TEXT[bill.failureReason]}`,
      at: bill.failedAt,
      href: `/servicios/pagar/${bill.id}`,
    });
  }
  for (const bill of sources.reminderBills) {
    const days = daysUntil(bill.dueDate, now);
    // From the reminder day to the due date; an overdue bill stops reminding.
    if (days < 0 || days > bill.reminderDays) continue;
    const label = dueLabel(bill.dueDate, now);
    items.push({
      id: `reminder-${bill.id}`,
      kind: "reminder",
      title: `${bill.nickname} ${label.charAt(0).toLowerCase()}${label.slice(1)}`,
      detail: `${formatMoney(bill.amountCents, bill.currency)} · ${bill.period}`,
      at: reminderDate(bill.dueDate, bill.reminderDays),
      href: `/servicios/pagar/${bill.id}`,
    });
  }

  return items
    .sort((a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id))
    .slice(0, MAX_NOTIFICATIONS)
    .map((item) => ({ ...item, unread: seenAt === null || item.at.getTime() > seenAt.getTime() }));
}
