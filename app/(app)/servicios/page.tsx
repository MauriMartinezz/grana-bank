import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { BackButton } from "@/components/ui/back-button";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { billAutomation } from "@/features/services/bill-automation";
import { COMPANY_INFO } from "@/features/services/companies";
import { dueLabel } from "@/features/services/due-date";
import { ProcessScheduledButton } from "@/features/services/process-scheduled-button";
import { listAdhesions, listFailedBills } from "@/features/services/queries";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Pago de servicios" };

export default async function ServicesPage() {
  const user = await getCurrentUser();
  const [adhesions, failed] = await Promise.all([
    listAdhesions(user.id),
    listFailedBills(user.id),
  ]);
  // Read after the session, so the screen is rendered per request.
  const now = new Date();

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/inicio" />
        <h1 className="font-serif text-2xl font-bold">Servicios</h1>
      </header>

      <Link href="/servicios/adherir" className={`${buttonClassName} mt-5 w-full gap-2`}>
        <PlusIcon className="size-5" />
        Adherir servicio
      </Link>

      {failed.length > 0 && (
        <section
          role="alert"
          aria-label="Pagos que no se pudieron hacer"
          className="mt-5 rounded-2xl border border-garnet/40 p-4 text-sm"
        >
          <p className="font-medium text-garnet">
            {failed.length === 1
              ? "Un pago programado no se pudo hacer"
              : `${failed.length} pagos programados no se pudieron hacer`}
          </p>
          <ul className="mt-2 space-y-1">
            {failed.map((bill) => (
              <li key={bill.id}>
                <Link href={`/servicios/pagar/${bill.id}`} className="underline">
                  {bill.adhesion.nickname} · {bill.period}
                </Link>
                : {bill.failureReason === "INSUFFICIENT_FUNDS" ? "no había saldo suficiente" : "la tarjeta ya no está disponible"}.
                Pagala o programala de nuevo.
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6">
        {adhesions.length > 0 ? (
          <ul aria-label="Tus servicios" className="space-y-px overflow-hidden rounded-2xl">
            {adhesions.map((adhesion) => {
              const company = COMPANY_INFO[adhesion.company];
              const next = adhesion.bills[0];
              const automation = next ? billAutomation(next, adhesion.autoDebitCard) : null;
              return (
                <li key={adhesion.id}>
                  <Link
                    // Straight to paying the next pending bill; to the service's
                    // bills when nothing is pending.
                    href={next ? `/servicios/pagar/${next.id}` : `/servicios/${adhesion.id}`}
                    className="flex items-center justify-between gap-3 bg-surface p-4 transition-colors hover:bg-surface/70 active:bg-surface/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{adhesion.nickname}</span>
                      <span className="block text-sm text-muted">
                        {company.name} · {company.service}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm">
                      {next ? (
                        <>
                          <span className="block font-medium">
                            {formatMoney(next.amountCents, next.currency)}
                          </span>
                          <span
                            className={`block ${automation?.kind === "failed" || dueLabel(next.dueDate, now) === "Vencida" ? "text-garnet" : "text-muted"}`}
                          >
                            {automation?.kind === "failed"
                              ? "No se pudo pagar"
                              : automation?.kind === "scheduled"
                                ? "Programado"
                                : automation?.kind === "auto-debit"
                                  ? `Débito automático · ${dueLabel(next.dueDate, now)}`
                                  : dueLabel(next.dueDate, now)}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">Sin facturas pendientes</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <StateMessage
            title="Todavía no adheriste servicios"
            description="Adherí AySA, Edesur, Edenor o Metrogas con el número de pago electrónico de tu factura y pagalos desde acá."
          />
        )}
      </div>

      {adhesions.length > 0 && (
        <div className="mt-6">
          <ProcessScheduledButton />
        </div>
      )}
    </>
  );
}
