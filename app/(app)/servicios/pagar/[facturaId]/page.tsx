import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { ACCOUNT_LABELS } from "@/features/cards/account-label";
import { COMPANY_INFO } from "@/features/services/companies";
import { dueLabel, formatDueDate } from "@/features/services/due-date";
import { PayBillForm } from "@/features/services/pay-bill-form";
import { getBill, getPaymentCards } from "@/features/services/queries";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Pagar factura" };

// Reads the URL at the top level: the route's loading.tsx is its Suspense
// boundary, so the shared shell never depends on the params.
export default async function PayBillPage({ params }: PageProps<"/servicios/pagar/[facturaId]">) {
  const { facturaId } = await params;
  const user = await getCurrentUser();
  const bill = await getBill(user.id, facturaId);
  if (!bill) notFound();
  const company = COMPANY_INFO[bill.adhesion.company];
  const adhesionPath = `/servicios/${bill.adhesion.id}`;
  const now = new Date();

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref={adhesionPath} />
        <h1 className="font-serif text-2xl font-bold">Pagar factura</h1>
      </header>

      <section aria-label="Factura" className="mt-5 mb-6 rounded-2xl bg-surface p-5">
        <p className="font-medium">
          {bill.adhesion.nickname} · {company.name}
        </p>
        <p className="mt-1 text-sm text-muted">{bill.period}</p>
        <p className="mt-3 text-3xl font-semibold">{formatMoney(bill.amountCents, bill.currency)}</p>
        <p className="mt-1 text-sm text-muted">
          {dueLabel(bill.dueDate, now)} · {formatDueDate(bill.dueDate)}
        </p>
      </section>

      {bill.status === "PAID" ? (
        <StateMessage title="Esta factura ya está paga" description="No hace falta pagarla de nuevo.">
          <Link href={adhesionPath} className={`${buttonClassName} mt-4`}>
            Ver facturas
          </Link>
        </StateMessage>
      ) : (
        <BillPayment userId={user.id} billId={bill.id} currency={bill.currency} />
      )}
    </>
  );
}

/** The card picker of the bill's currency, or why it cannot show. */
async function BillPayment({
  userId,
  billId,
  currency,
}: {
  userId: string;
  billId: string;
  currency: "ARS" | "USD";
}) {
  const payment = await getPaymentCards(userId, currency);
  const account = ACCOUNT_LABELS[currency].toLowerCase();
  if (!payment) {
    return (
      <StateMessage
        title={`No tenés una ${account}`}
        description={`Esta factura se paga con una tarjeta de tu ${account}.`}
      />
    );
  }
  if (payment.cards.length === 0) {
    return (
      <StateMessage
        title="Te falta una tarjeta"
        description={`Agregá una tarjeta a tu ${account} para pagar esta factura.`}
      >
        <Link href="/tarjetas/nueva" className="mt-2 font-serif text-sm text-garnet">
          Agregar tarjeta
        </Link>
      </StateMessage>
    );
  }
  return (
    <>
      <p className="mb-5 text-sm text-muted">
        Disponible:{" "}
        <span className="font-medium text-ink">{formatMoney(payment.balanceCents, currency)}</span>
      </p>
      <PayBillForm billId={billId} cards={payment.cards} />
    </>
  );
}
