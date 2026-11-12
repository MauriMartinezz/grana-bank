import type { Metadata } from "next";
import { StateMessage } from "@/components/ui/state-message";
import { requireAdmin } from "@/features/admin/guard";
import { PromotionForm } from "@/features/admin/promotion-form";
import { PromotionCard } from "@/features/promotions/promotion-card";
import { listAllPromotions } from "@/features/promotions/queries";

export const metadata: Metadata = { title: "Promociones · Administración" };

// Reads the session at the top level: the route's loading.tsx is its Suspense boundary.
export default async function AdminPromotionsPage() {
  await requireAdmin();
  const promotions = await listAllPromotions();

  return (
    <>
      <h1 className="font-serif text-2xl font-bold">Promociones</h1>

      <section aria-labelledby="new-promotion" className="mt-6 rounded-2xl bg-surface/50 p-4">
        <h2 id="new-promotion" className="mb-4 font-serif text-xl font-bold">
          Nueva promoción
        </h2>
        <PromotionForm />
      </section>

      <section aria-labelledby="all-promotions" className="mt-8">
        <h2 id="all-promotions" className="mb-3 font-serif text-xl font-bold">
          Todas las promociones
        </h2>
        {promotions.length > 0 ? (
          <ul className="space-y-3">
            {promotions.map((promotion) => (
              <li key={promotion.id}>
                <PromotionCard promotion={promotion} />
              </li>
            ))}
          </ul>
        ) : (
          <StateMessage
            title="Todavía no hay promociones"
            description="Las que crees aparecen acá y en Promociones."
          />
        )}
      </section>
    </>
  );
}
