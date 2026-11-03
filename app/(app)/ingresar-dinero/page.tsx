import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { listAccounts } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { ACCOUNT_LABELS } from "@/features/cards/account-label";
import { findTestAccount } from "@/features/deposits/deposit";
import { DepositForm } from "@/features/deposits/deposit-form";

export const metadata: Metadata = { title: "Ingresar dinero" };

export default async function DepositPage() {
  const user = await getCurrentUser();
  const [accounts, sourceArs, sourceUsd] = await Promise.all([
    listAccounts(user.id),
    findTestAccount("ARS"),
    findTestAccount("USD"),
  ]);
  const sources = [sourceArs, sourceUsd].filter((source) => source !== null);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/inicio" />
        <h1 className="font-serif text-2xl font-bold">Ingresar dinero</h1>
      </header>
      <Link
        href="/ingresar-dinero/programar"
        className="mt-3 inline-flex min-h-11 items-center font-serif text-sm text-garnet"
      >
        Programar ingresos
      </Link>

      {sources.length === 0 ? (
        <div className="mt-6">
          <StateMessage
            title="La cuenta de prueba no está disponible"
            description="Se crea con los datos de demo: corré pnpm db:seed y volvé a intentarlo."
          />
        </div>
      ) : (
        <>
          <section aria-label="Origen del dinero" className="mt-5 rounded-2xl bg-surface p-5">
            <p className="text-sm text-muted">El dinero sale de</p>
            <p className="mt-1 font-medium">{sources[0].name}</p>
            <ul className="mt-1 space-y-0.5 text-sm text-muted">
              {sources.map((source) => (
                <li key={source.currency}>
                  {source.currency} · alias {source.alias}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Una cuenta de demo: el ingreso llega como un pago recibido.
            </p>
          </section>

          <div className="mt-6">
            <DepositForm
              accounts={accounts
                .filter((account) => sources.some((s) => s.currency === account.currency))
                .map((account) => ({
                  currency: account.currency,
                  alias: account.alias,
                  label: ACCOUNT_LABELS[account.currency],
                }))}
            />
          </div>
        </>
      )}
    </>
  );
}
