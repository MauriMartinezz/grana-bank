import type { MovementType } from "@/generated/prisma/client";
import { addDays, dayKey, isDayKey } from "./day";

const MAX_QUERY_LENGTH = 100;

export type MovementFilters = {
  query: string;
  type: MovementType | null;
  /** First Buenos Aires day included, `YYYY-MM-DD` (`?desde=`). */
  from?: string;
  /** Last Buenos Aires day included, `YYYY-MM-DD` (`?hasta=`). */
  to?: string;
};

export const NO_FILTERS: MovementFilters = { query: "", type: null };

/** Quick filters in display order. `value` is what travels in the URL. */
export const TYPE_FILTERS = [
  { value: null, label: "Todos" },
  { value: "subscription", label: "Suscripción" },
  { value: "received", label: "Recibido" },
  { value: "sent", label: "Enviado" },
] as const;

const TYPES_BY_URL_VALUE = new Map<string, MovementType>([
  ["subscription", "SUBSCRIPTION"],
  ["received", "RECEIVED"],
  ["sent", "SENT"],
]);

type UrlParam = string | string[] | undefined;

function firstValue(param: UrlParam): string {
  return (Array.isArray(param) ? param[0] : param) ?? "";
}

function dayParam(param: UrlParam): string | undefined {
  const value = firstValue(param);
  return isDayKey(value) ? value : undefined;
}

/**
 * The URL is user input: anything unknown falls back to "no filter". An
 * invalid day drops only that bound; a reversed range drops both.
 */
export function parseMovementFilters(params: {
  q?: UrlParam;
  type?: UrlParam;
  desde?: UrlParam;
  hasta?: UrlParam;
}): MovementFilters {
  let from = dayParam(params.desde);
  let to = dayParam(params.hasta);
  if (from && to && from > to) {
    from = undefined;
    to = undefined;
  }
  return {
    query: firstValue(params.q).trim().slice(0, MAX_QUERY_LENGTH),
    type: TYPES_BY_URL_VALUE.get(firstValue(params.type)) ?? null,
    ...(from && { from }),
    ...(to && { to }),
  };
}

export function hasDateFilter({ from, to }: MovementFilters): boolean {
  return Boolean(from || to);
}

export function hasActiveFilters(filters: MovementFilters): boolean {
  return filters.query !== "" || filters.type !== null || hasDateFilter(filters);
}

export type DatePreset = { label: string; from: string; to: string };

/** Quick date filters in display order, as Buenos Aires days ending today. */
export function dateFilterPresets(now: Date): DatePreset[] {
  const today = dayKey(now);
  return [
    { label: "Hoy", from: today, to: today },
    { label: "Últimos 7 días", from: addDays(today, -6), to: today },
    { label: "Este mes", from: `${today.slice(0, 8)}01`, to: today },
  ];
}
