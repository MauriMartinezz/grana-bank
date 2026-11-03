import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { COMPANY_INFO } from "@/features/services/companies";
import { dueLabel, formatDueDate } from "@/features/services/due-date";
import { getAdhesion } from "@/features/services/queries";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Facturas del servicio" };

// Reads the URL at the top level: the route's loading.tsx is its Suspense
// boundary, so the shared shell never depends on the params.
export default async function AdhesionPage({ params }: PageProps<"/servicios/[adhesionId]">) {
  const { adhesionId } = await params;
  const user = await getCurrentUser();
  const adhesion = await getAdhesion(user.id, adhesionId);
  if (!adhesion) notFound();
  const company = COMPANY_INFO[adhesion.company];
  const now = new Date();

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/servicios" />
        <h1 className="truncate font-serif text-2xl font-bold">{adhesion.nickname}</h1>
      </header>

      <section aria-label="Servicio" className="mt-5 rounded-2xl bg-surface p-5">
        <p className="font-medium">
          {company.name} · {company.service}
        </p>
        <p className="mt-1 text-sm tracking-wide text-muted">
          N.º de pago electrónico {adhesion.paymentNumber}
        </p>
      </section>

      <h2 className="mt-6 mb-3 font-serif text-lg font-bold">Facturas</h2>
      {adhesion.bills.length > 0 ? (
        <ul aria-label="Facturas" className="space-y-px overflow-hidden rounded-2xl">
          {adhesion.bills.map((bill) => {
            const pending = bill.status === "PENDING";
            const label = dueLabel(bill.dueDate, now);
            return (
              <li key={bill.id} className="flex items-center justify-between gap-3 bg-surface p-4">
                <span className="min-w-0">
                  <span className="block font-medium">{bill.period}</span>
                  <span className="block text-sm text-muted">
                    {formatMoney(bill.amountCents, bill.currency)}
                  </span>
                  <span
                    className={`block text-sm ${pending && label === "Vencida" ? "text-garnet" : "text-muted"}`}
                  >
                    {pending
                      ? `${label} · ${formatDueDate(bill.dueDate)}`
                      : `Pagada el ${bill.paidAt ? formatDate(bill.paidAt) : ""}`}
                  </span>
                </span>
                {pending ? (
                  <Link
                    href={`/servicios/pagar/${bill.id}`}
                    aria-label={`Pagar ${bill.period}`}
                    className="flex min-h-11 shrink-0 items-center rounded-full bg-garnet-fill px-5 font-serif text-sm text-white"
                  >
                    Pagar
                  </Link>
                ) : (
                  <span className="shrink-0 font-serif text-sm text-muted">Pagada</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <StateMessage title="No hay facturas" description="Este servicio todavía no tiene facturas." />
      )}
    </>
  );
}
