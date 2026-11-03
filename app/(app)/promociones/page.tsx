import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { CATEGORY_LABELS, PROMOTION_CATEGORIES } from "@/features/promotions/catalog";
import {
  buenosAiresWeekday,
  DAY_CHIPS,
  DAY_SLUGS,
  promotionsHref,
  readPromotionFilters,
} from "@/features/promotions/filters";
import { PromotionCard } from "@/features/promotions/promotion-card";
import { listPromotions } from "@/features/promotions/queries";

export const metadata: Metadata = { title: "Promociones" };

const CHIP =
  "flex min-h-11 shrink-0 items-center rounded-full px-4 font-serif text-sm aria-[current=true]:bg-garnet-fill aria-[current=true]:text-white bg-surface";

// Reads the URL at the top level: the route's loading.tsx is its Suspense boundary.
export default async function PromotionsPage({ searchParams }: PageProps<"/promociones">) {
  const [params] = await Promise.all([searchParams, getCurrentUser()]);
  const now = new Date();
  const filters = readPromotionFilters(params, buenosAiresWeekday(now));
  const promotions = await listPromotions(filters, now);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/inicio" />
        <h1 className="font-serif text-2xl font-bold">Promociones</h1>
      </header>

      <nav aria-label="Día" className="-mx-4 mt-5 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {DAY_SLUGS.map((slug, index) => (
            <li key={slug}>
              <Link
                href={promotionsHref(slug, filters.category)}
                aria-current={filters.day === slug}
                className={CHIP}
              >
                {DAY_CHIPS[index]}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={promotionsHref("todos", filters.category)}
              aria-current={filters.day === "todos"}
              className={CHIP}
            >
              Todos los días
            </Link>
          </li>
        </ul>
      </nav>

      <nav aria-label="Categoría" className="-mx-4 mt-3 overflow-x-auto px-4">
        <ul className="flex gap-2">
          <li>
            <Link
              href={promotionsHref(filters.day, null)}
              aria-current={filters.category === null}
              className={CHIP}
            >
              Todas
            </Link>
          </li>
          {PROMOTION_CATEGORIES.map((category) => (
            <li key={category}>
              <Link
                href={promotionsHref(filters.day, category)}
                aria-current={filters.category === category}
                className={CHIP}
              >
                {CATEGORY_LABELS[category]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        {promotions.length > 0 ? (
          <ul aria-label="Promociones" className="space-y-3">
            {promotions.map((promotion) => (
              <li key={promotion.id}>
                <PromotionCard promotion={promotion} />
              </li>
            ))}
          </ul>
        ) : (
          <StateMessage
            title="No hay promociones con estos filtros"
            description="Probá con otro día u otra categoría."
          />
        )}
      </div>
    </>
  );
}
