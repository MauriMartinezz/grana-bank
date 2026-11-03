import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { SUBSCRIPTION_CATALOG } from "@/features/subscriptions/catalog";
import { SubscribeForm } from "@/features/subscriptions/subscribe-form";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Agregar suscripción" };

export default async function NewSubscriptionPage() {
  // Only signed-in users see the catalog.
  await getCurrentUser();

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/suscripciones" />
        <h1 className="font-serif text-2xl font-bold">Agregar suscripción</h1>
      </header>
      <p className="mt-2 text-sm text-muted">
        Se cobraría todos los meses el día de hoy en tu tarjeta en pesos. Es una demo: no se cobra.
      </p>

      <ul aria-label="Servicios disponibles" className="mt-6 space-y-3">
        {SUBSCRIPTION_CATALOG.map((item) => (
          <li key={item.slug} className="rounded-2xl bg-surface p-4">
            <SubscribeForm slug={item.slug} merchant={item.merchant}>
              <p className="truncate font-medium">{item.merchant}</p>
              <p className="text-sm text-muted">{item.description}</p>
              <p className="mt-1 text-sm font-medium">
                {formatMoney(item.amountCents, "ARS")}
                <span className="font-normal text-muted"> por mes</span>
              </p>
            </SubscribeForm>
          </li>
        ))}
      </ul>
    </>
  );
}
