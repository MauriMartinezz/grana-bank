import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { BackButton } from "@/components/ui/back-button";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { formatDueDate } from "@/features/services/due-date";
import { listSubscriptions } from "@/features/subscriptions/queries";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Suscripciones" };

export default async function SubscriptionsPage() {
  const user = await getCurrentUser();
  // Read after the session, so the screen is rendered per request.
  const subscriptions = await listSubscriptions(user.id, new Date());

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/perfil" />
        <h1 className="font-serif text-2xl font-bold">Suscripciones</h1>
      </header>
      <p className="mt-2 text-sm text-muted">Es una demo: ninguna suscripción se cobra.</p>

      <Link href="/suscripciones/nueva" className={`${buttonClassName} mt-5 w-full gap-2`}>
        <PlusIcon className="size-5" />
        Agregar suscripción
      </Link>

      <div className="mt-6">
        {subscriptions.length > 0 ? (
          <ul aria-label="Tus suscripciones" className="space-y-px overflow-hidden rounded-2xl">
            {subscriptions.map((subscription) => (
              <li key={subscription.id}>
                <Link
                  href={`/suscripciones/${subscription.id}`}
                  className="flex items-center justify-between gap-3 bg-surface p-4 transition-colors hover:bg-surface/70 active:bg-surface/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{subscription.merchant}</span>
                    <span className="block text-sm text-muted">
                      {subscription.nextCharge
                        ? `Próximo cobro: ${formatDueDate(subscription.nextCharge)}`
                        : `Dada de baja el ${subscription.cancelledAt ? formatDate(subscription.cancelledAt) : ""}`}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-right text-sm font-medium ${subscription.nextCharge ? "" : "text-muted"}`}
                  >
                    {formatMoney(subscription.amountCents, subscription.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <StateMessage
            title="Todavía no tenés suscripciones"
            description="Agregá una del catálogo para ver cuándo se cobraría y darla de baja cuando quieras."
          />
        )}
      </div>
    </>
  );
}
