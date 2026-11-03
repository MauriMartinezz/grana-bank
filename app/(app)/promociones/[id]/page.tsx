import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { CATEGORY_LABELS } from "@/features/promotions/catalog";
import {
  cardText,
  daysText,
  discountText,
  validityText,
} from "@/features/promotions/filters";
import { getPromotion } from "@/features/promotions/queries";

export const metadata: Metadata = { title: "Promoción" };

export default async function PromotionPage({ params }: PageProps<"/promociones/[id]">) {
  const [{ id }] = await Promise.all([params, getCurrentUser()]);
  const promotion = await getPromotion(id);
  if (!promotion) notFound();

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/promociones" />
        <h1 className="truncate font-serif text-2xl font-bold">{promotion.merchant}</h1>
      </header>

      <section className="mt-5 rounded-2xl bg-surface p-6">
        <p className="text-sm text-muted">{CATEGORY_LABELS[promotion.category]}</p>
        <p className="mt-1 text-3xl font-semibold">{promotion.percent}% de descuento</p>
        <p className="mt-1 font-medium">{discountText(promotion.percent, promotion.capCents)}</p>
        <dl className="mt-6 divide-y divide-line text-sm">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Días</dt>
            <dd className="text-right font-medium">{daysText(promotion.weekdays)}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Tarjetas</dt>
            <dd className="text-right font-medium">{cardText(promotion.cardBrand)}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Vigencia</dt>
            <dd className="text-right font-medium">{validityText(promotion.validUntil)}</dd>
          </div>
        </dl>
        <h2 className="mt-4 text-sm font-medium">Condiciones</h2>
        <p className="mt-1 text-sm text-muted">{promotion.conditions}</p>
        <p className="mt-4 text-xs text-muted">
          Promoción informativa: el descuento lo aplica el comercio al pagar.
        </p>
      </section>
    </>
  );
}
