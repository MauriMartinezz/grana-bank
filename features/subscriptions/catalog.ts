/**
 * Subscriptions are a demo: they are listed, added and cancelled, but nothing
 * charges them. Relative imports only: the seed uses it too.
 */

/** The demo user's subscriptions, matching their seeded charges. */
export const SEEDED_SUBSCRIPTIONS = [
  { merchant: "Adobe", amountCents: 12_500, billingDay: 30 },
  { merchant: "Figma", amountCents: 12_500, billingDay: 27 },
  { merchant: "Spotify", amountCents: 1_299, billingDay: 10 },
  { merchant: "Netflix", amountCents: 1_999, billingDay: 5 },
] as const;

/** Invented services a user can subscribe to. */
export const SUBSCRIPTION_CATALOG = [
  { slug: "playcine", merchant: "PlayCine", description: "Películas y series", amountCents: 499_900 },
  { slug: "ritmo", merchant: "Ritmo", description: "Música sin anuncios", amountCents: 249_900 },
  { slug: "nube-segura", merchant: "Nube Segura", description: "200 GB de almacenamiento", amountCents: 189_900 },
  { slug: "lectura-diaria", merchant: "Lectura Diaria", description: "Diario digital", amountCents: 320_000 },
] as const;

export type CatalogSubscription = (typeof SUBSCRIPTION_CATALOG)[number];

export function catalogItem(slug: string): CatalogSubscription | null {
  return SUBSCRIPTION_CATALOG.find((item) => item.slug === slug) ?? null;
}
