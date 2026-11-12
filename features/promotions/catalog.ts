/**
 * The invented promotions the seed loads: no real brand appears. Relative
 * imports only: the seed uses it too.
 */

export const PROMOTION_CATEGORIES = [
  "DEPORTES",
  "SUPERMERCADO",
  "CINE",
  "GIMNASIO",
  "ROPA",
  "FARMACIA",
] as const;

export type PromotionCategory = (typeof PROMOTION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<PromotionCategory, string> = {
  DEPORTES: "Deportes",
  SUPERMERCADO: "Supermercado",
  CINE: "Cine",
  GIMNASIO: "Gimnasio",
  ROPA: "Ropa",
  FARMACIA: "Farmacia",
};

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];

export type CatalogPromotion = {
  merchant: string;
  category: PromotionCategory;
  percent: number;
  /** Whole pesos. */
  capPesos: number;
  /** Whole pesos; absent when any purchase applies. */
  minPurchasePesos?: number;
  /** Absent when no bank offers it. */
  bank?: string;
  /** 1 (Monday) to 7 (Sunday). */
  weekdays: number[];
  /** Null when every card applies. */
  cardBrand: "VISA" | "MASTERCARD" | "AMEX" | null;
  conditions: string;
};

export const PROMOTIONS: CatalogPromotion[] = [
  {
    merchant: "Deportes Andes",
    category: "DEPORTES",
    percent: 20,
    capPesos: 15_000,
    weekdays: [3],
    cardBrand: null,
    conditions: "En calzado e indumentaria deportiva, en local y online. No acumulable con otras promociones.",
  },
  {
    merchant: "Deportes Andes",
    category: "DEPORTES",
    percent: 15,
    capPesos: 10_000,
    weekdays: [6, 7],
    cardBrand: "VISA",
    conditions: "En bicicletas y accesorios de camping. Una compra por día.",
  },
  {
    merchant: "Súper Ahorro",
    category: "SUPERMERCADO",
    percent: 25,
    capPesos: 8_000,
    minPurchasePesos: 30_000,
    bank: "Banco Ceibo",
    weekdays: [2, 4],
    cardBrand: null,
    conditions: "Excluye bebidas alcohólicas y electrónica.",
  },
  {
    merchant: "Súper Ahorro",
    category: "SUPERMERCADO",
    percent: 10,
    capPesos: 5_000,
    weekdays: EVERY_DAY,
    cardBrand: "MASTERCARD",
    conditions: "En frescos: frutas, verduras y carnicería. Tope por semana.",
  },
  {
    merchant: "CineCity",
    category: "CINE",
    percent: 50,
    capPesos: 6_000,
    weekdays: [1, 2],
    cardBrand: null,
    conditions: "En entradas 2D y 3D, hasta 4 por compra. No incluye salas premium.",
  },
  {
    merchant: "CineCity",
    category: "CINE",
    percent: 30,
    capPesos: 4_000,
    weekdays: [5, 6, 7],
    cardBrand: "VISA",
    conditions: "En combos de pochoclos y bebida comprados junto con la entrada.",
  },
  {
    merchant: "Fit Barrio",
    category: "GIMNASIO",
    percent: 30,
    capPesos: 12_000,
    weekdays: EVERY_DAY,
    cardBrand: null,
    conditions: "En la cuota mensual con débito automático, durante los primeros 3 meses.",
  },
  {
    merchant: "Fit Barrio",
    category: "GIMNASIO",
    percent: 15,
    capPesos: 7_000,
    weekdays: [1],
    cardBrand: "MASTERCARD",
    conditions: "En clases sueltas de spinning, funcional y yoga.",
  },
  {
    merchant: "Trama",
    category: "ROPA",
    percent: 20,
    capPesos: 20_000,
    weekdays: [4, 5],
    cardBrand: null,
    conditions: "En toda la tienda, excepto productos con otras promociones.",
  },
  {
    merchant: "Trama",
    category: "ROPA",
    percent: 35,
    capPesos: 25_000,
    minPurchasePesos: 50_000,
    bank: "Banco Ombú",
    weekdays: [7],
    cardBrand: "AMEX",
    conditions: "En la colección de temporada, en local y online.",
  },
  {
    merchant: "FarmaPlus",
    category: "FARMACIA",
    percent: 15,
    capPesos: 6_000,
    weekdays: [1, 3, 5],
    cardBrand: null,
    conditions: "En perfumería y cuidado personal. No incluye medicamentos.",
  },
  {
    merchant: "FarmaPlus",
    category: "FARMACIA",
    percent: 10,
    capPesos: 4_000,
    weekdays: EVERY_DAY,
    cardBrand: "VISA",
    conditions: "En medicamentos de venta libre. Tope por mes.",
  },
];
