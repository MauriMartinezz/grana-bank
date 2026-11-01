import type { MovementType } from "@/generated/prisma/client";

const MAX_QUERY_LENGTH = 100;

export type MovementFilters = {
  query: string;
  type: MovementType | null;
};

export const NO_FILTERS: MovementFilters = { query: "", type: null };

/** Quick filters in display order. `value` is what travels in the URL. */
export const TYPE_FILTERS = [
  { value: null, label: "Todos" },
  { value: "subscription", label: "Suscripción" },
  { value: "received", label: "Recibido" },
  { value: "sent", label: "Enviado" },
] as const;

const TYPES_BY_URL_VALUE: Record<string, MovementType> = {
  subscription: "SUBSCRIPTION",
  received: "RECEIVED",
  sent: "SENT",
};

type UrlParam = string | string[] | undefined;

function firstValue(param: UrlParam): string {
  return (Array.isArray(param) ? param[0] : param) ?? "";
}

/** The URL is user input: anything unknown falls back to "no filter". */
export function parseMovementFilters(params: {
  q?: UrlParam;
  type?: UrlParam;
}): MovementFilters {
  return {
    query: firstValue(params.q).trim().slice(0, MAX_QUERY_LENGTH),
    type: TYPES_BY_URL_VALUE[firstValue(params.type)] ?? null,
  };
}

export function hasActiveFilters({ query, type }: MovementFilters): boolean {
  return query !== "" || type !== null;
}
