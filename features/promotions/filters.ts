/**
 * Promotion filters read from the URL and the texts every screen shows. Pure,
 * so the list, the detail and the Home card agree.
 */
import { BRAND_NAMES } from "@/features/cards/validation";
import type { CardBrand } from "@/generated/prisma/client";
import { formatMoney } from "@/lib/format";
import { PROMOTION_CATEGORIES, type PromotionCategory } from "./catalog";

/** URL names of the weekdays, Monday first; the index + 1 is the weekday. */
export const DAY_SLUGS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
] as const;

export type DaySlug = (typeof DAY_SLUGS)[number] | "todos";

/** Chip labels, Monday first. */
export const DAY_CHIPS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** Plural, as in "los lunes": the days a promotion applies. */
const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Argentina/Buenos_Aires",
  weekday: "short",
});
const ENGLISH_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Today's weekday in Buenos Aires, from Monday 1 to Sunday 7. */
export function buenosAiresWeekday(now: Date): number {
  return ENGLISH_DAYS.indexOf(WEEKDAY_FORMATTER.format(now)) + 1;
}

type SearchParam = string | string[] | undefined;

export type PromotionFilters = {
  day: DaySlug;
  /** 1 to 7, or null for every day. */
  weekday: number | null;
  category: PromotionCategory | null;
};

/** The filters of the URL; today and every category when absent or unknown. */
export function readPromotionFilters(
  params: { dia?: SearchParam; categoria?: SearchParam },
  today: number,
): PromotionFilters {
  const dia = typeof params.dia === "string" ? params.dia : null;
  const categoria = typeof params.categoria === "string" ? params.categoria.toUpperCase() : null;
  const category = PROMOTION_CATEGORIES.find((c) => c === categoria) ?? null;
  if (dia === "todos") return { day: "todos", weekday: null, category };
  const index = DAY_SLUGS.findIndex((slug) => slug === dia);
  const weekday = index === -1 ? today : index + 1;
  return { day: DAY_SLUGS[weekday - 1], weekday, category };
}

/** `20% hasta $15.000`. */
export function discountText(percent: number, capCents: bigint) {
  return `${percent}% hasta ${formatMoney(capCents, "ARS")}`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `Lunes y miércoles`, `Todos los días`. */
export function daysText(weekdays: number[]) {
  if (weekdays.length === 7) return "Todos los días";
  const names = [...weekdays].sort((a, b) => a - b).map((day) => DAY_NAMES[day - 1]);
  const text =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  return capitalize(text);
}

/** `Solo Visa`, or every card when the promotion names no brand. */
export function cardText(brand: CardBrand | null) {
  return brand ? `Solo ${BRAND_NAMES[brand]}` : "Todas tus tarjetas";
}

/** The brands of the user's cards, each once, in the order of `BRAND_NAMES`. */
export function heldBrands(accounts: { cards: { brand: CardBrand }[] }[]): CardBrand[] {
  const held = new Set(accounts.flatMap((account) => account.cards.map((card) => card.brand)));
  return (Object.keys(BRAND_NAMES) as CardBrand[]).filter((brand) => held.has(brand));
}

/** The card of the URL when the user holds it; every card otherwise. */
export function readCardFilter(tarjeta: SearchParam, held: CardBrand[]): CardBrand | null {
  const brand = typeof tarjeta === "string" ? tarjeta.toUpperCase() : null;
  return held.find((b) => b === brand) ?? null;
}

/** The promotions of a brand plus those for every card; all when null. */
export function filterByCard<T extends { cardBrand: CardBrand | null }>(
  promotions: T[],
  brand: CardBrand | null,
): T[] {
  if (brand === null) return promotions;
  return promotions.filter((p) => p.cardBrand === null || p.cardBrand === brand);
}

/**
 * The list URL for a day, a category and a card; every category and every
 * card when null.
 */
export function promotionsHref(
  day: DaySlug,
  category: PromotionCategory | null,
  card: CardBrand | null = null,
) {
  const query = new URLSearchParams({ dia: day });
  if (category) query.set("categoria", category.toLowerCase());
  if (card) query.set("tarjeta", card.toLowerCase());
  return `/promociones?${query}`;
}

const VALIDITY_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** `Hasta el 31 de diciembre`, from a date column's UTC midnight. */
export function validityText(validUntil: Date) {
  return `Hasta el ${VALIDITY_FORMATTER.format(validUntil)}`;
}
