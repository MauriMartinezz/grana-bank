import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { cardOption } from "@/features/exchange/queries";
import { COMPANY_INFO } from "@/features/services/companies";
import { ConfirmBillPaymentForm } from "@/features/services/confirm-form";
import { payPathFor, readBillConfirmation } from "@/features/services/confirmation";
import { formatDueDate } from "@/features/services/due-date";
import { findServicePaymentMovementByKey } from "@/features/services/pay-bill";
import { getBill } from "@/features/services/queries";
import { getOwnedCard } from "@/features/top-ups/queries";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Confirmar pago" };

// Reads the URL at the top level: the route's loading.tsx is its Suspense
// boundary, so the shared shell never depends on the query string.
export default async function ConfirmBillPaymentPage({
  searchParams,
}: PageProps<"/servicios/confirmar">) {
  const { bill: billParam, card, key } = await searchParams;
  const confirmation = readBillConfirmation({ bill: billParam, card, key });
  if ("redirectTo" in confirmation) redirect(confirmation.redirectTo);
  const { idempotencyKey, ...draft } = confirmation;
  const payPath = payPathFor(draft.billId);

  const user = await getCurrentUser();
  // Back from the receipt lands here: show the receipt instead of offering
  // to confirm a payment that already happened.
  const done = await findServicePaymentMovementByKey(user.id, idempotencyKey);
  if (done) redirect(`/servicios/comprobante/${done}`);

  const [bill, paying] = await Promise.all([
    getBill(user.id, draft.billId),
    getOwnedCard(user.id, draft.cardId),
  ]);
  if (!bill) redirect("/servicios");
  // A paid bill or a card of another currency goes back to the bill's screen,
  // which says why.
  if (bill.status !== "PENDING" || !paying || paying.account.currency !== bill.currency) {
    redirect(payPath);
  }

  const remaining = paying.account.balanceCents - bill.amountCents;
  const option = cardOption(paying);
  const company = COMPANY_INFO[bill.adhesion.company];

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref={payPath} />
        <h1 className="font-serif text-2xl font-bold">Revisá el pago</h1>
      </header>

      <section className="mt-5 rounded-2xl bg-surface p-6">
        <p className="text-center text-sm text-muted">Vas a pagar</p>
        <p className="mt-1 text-center text-3xl font-semibold">
          {formatMoney(bill.amountCents, bill.currency)}
        </p>
        <dl className="mt-6 divide-y divide-line text-sm">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Servicio</dt>
            <dd className="text-right font-medium">
              {company.name} · {bill.adhesion.nickname}
            </dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Factura</dt>
            <dd className="text-right">
              <span className="block font-medium">{bill.period}</span>
              <span className="block text-muted">Vence el {formatDueDate(bill.dueDate)}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Pagás con</dt>
            <dd className="text-right">
              <span className="block font-medium">{option.label}</span>
              <span className="block text-muted">{option.detail}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Saldo después</dt>
            <dd className={`font-medium ${remaining < 0 ? "text-garnet" : ""}`}>
              {remaining < 0 ? "Saldo insuficiente" : formatMoney(remaining, bill.currency)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 space-y-3">
        <ConfirmBillPaymentForm draft={draft} idempotencyKey={idempotencyKey} />
        <Link
          href={payPath}
          className="flex min-h-12 items-center justify-center font-serif text-sm text-garnet"
        >
          Modificar pago
        </Link>
      </div>
    </>
  );
}
