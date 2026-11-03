import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { cardOption } from "@/features/exchange/queries";
import { getPaymentCards } from "@/features/services/queries";
import { formatDueDate } from "@/features/services/due-date";
import { CancelSubscriptionForm } from "@/features/subscriptions/cancel-form";
import { ChangeCardForm } from "@/features/subscriptions/change-card-form";
import {
  getSubscription,
  listPreviousCharges,
  nextChargeDate,
} from "@/features/subscriptions/queries";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Suscripción" };

// Reads the URL at the top level: the route's loading.tsx is its Suspense
// boundary, so the shared shell never depends on the params.
export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const subscription = await getSubscription(user.id, id);
  if (!subscription) notFound();
  const active = subscription.status === "ACTIVE";
  const [charges, payment] = await Promise.all([
    listPreviousCharges(user.id, subscription.merchant),
    active ? getPaymentCards(user.id, subscription.currency) : null,
  ]);
  const card = subscription.card ? cardOption(subscription.card) : null;

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/suscripciones" />
        <h1 className="truncate font-serif text-2xl font-bold">{subscription.merchant}</h1>
      </header>

      <section aria-label="Suscripción" className="mt-5 rounded-2xl bg-surface p-5">
        <p className="font-serif text-2xl font-bold">
          {formatMoney(subscription.amountCents, subscription.currency)}
          <span className="font-sans text-sm font-normal text-muted"> por mes</span>
        </p>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Tarjeta</dt>
            <dd className="text-right">{card ? card.label : "Sin tarjeta"}</dd>
          </div>
          {active ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Próximo cobro</dt>
              <dd className="text-right">
                {formatDueDate(nextChargeDate(subscription.billingDay, new Date()))}
              </dd>
            </div>
          ) : (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Estado</dt>
              <dd className="text-right text-garnet">
                Dada de baja el {subscription.cancelledAt ? formatDate(subscription.cancelledAt) : ""}
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-3 text-xs text-muted">Es una demo: esta suscripción no se cobra.</p>
      </section>

      {active && payment && payment.cards.length > 0 && (
        <section aria-label="Cambiar tarjeta" className="mt-4 rounded-2xl bg-surface p-5">
          <ChangeCardForm
            subscriptionId={subscription.id}
            cards={payment.cards}
            selected={subscription.card?.id ?? ""}
          />
        </section>
      )}

      <h2 className="mt-6 mb-3 font-serif text-lg font-bold">Cobros anteriores</h2>
      {charges.length > 0 ? (
        <ul aria-label="Cobros anteriores" className="space-y-px overflow-hidden rounded-2xl">
          {charges.map((charge) => (
            <li key={charge.id}>
              <Link
                href={`/movimientos/${charge.id}`}
                className="flex items-center justify-between gap-3 bg-surface p-4 transition-colors hover:bg-surface/70 active:bg-surface/60"
              >
                <span className="text-sm">{formatDate(charge.occurredAt)}</span>
                <span className="shrink-0 text-sm font-medium">
                  {formatMoney(charge.amountCents, charge.account.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <StateMessage
          title="Sin cobros anteriores"
          description="Esta suscripción todavía no tiene movimientos."
        />
      )}

      {active && (
        <div className="mt-6">
          <CancelSubscriptionForm
            subscriptionId={subscription.id}
            merchant={subscription.merchant}
          />
        </div>
      )}
    </>
  );
}
