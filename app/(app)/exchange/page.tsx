import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { listAccounts } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { ExchangeForm } from "@/features/exchange/exchange-form";
import { OpenAccountForm } from "@/features/exchange/open-account-form";
import { cardOption } from "@/features/exchange/queries";
import { ARS_PER_USD } from "@/features/exchange/rate";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Dólares" };

export default async function ExchangePage() {
  const user = await getCurrentUser();
  const accounts = await listAccounts(user.id);
  const ars = accounts.find((account) => account.currency === "ARS");
  const usd = accounts.find((account) => account.currency === "USD");
  const optionsOf = (account: (typeof accounts)[number]) =>
    account.cards.map((card) => cardOption({ ...card, account }));

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/home" />
        <h1 className="font-serif text-2xl font-bold">Comprar y vender dólares</h1>
      </header>

      <section aria-label="Cotización y saldos" className="mt-5 rounded-2xl bg-white p-5">
        <p className="text-sm text-muted">Cotización</p>
        <p className="mt-1 text-2xl font-semibold">1 USD = {formatMoney(ARS_PER_USD * 100, "ARS")}</p>
        <p className="mt-1 text-xs text-muted">El mismo valor para comprar y para vender.</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <dt className="text-muted">Tus pesos</dt>
            <dd className="font-medium">{ars ? formatMoney(ars.balanceCents, "ARS") : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Tus dólares</dt>
            <dd className="font-medium">{usd ? formatMoney(usd.balanceCents, "USD") : "—"}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6">
        {!ars ? (
          <StateMessage
            title="No tenés una cuenta en pesos"
            description="Necesitás una cuenta en pesos para comprar o vender dólares."
          />
        ) : !usd ? (
          <StateMessage
            title="Todavía no tenés una cuenta en dólares"
            description="Abrila gratis para comprar dólares con tus pesos y venderlos cuando quieras."
          >
            <OpenAccountForm />
          </StateMessage>
        ) : ars.cards.length === 0 || usd.cards.length === 0 ? (
          <StateMessage
            title="Te falta una tarjeta"
            description={`Para operar necesitás una tarjeta en cada cuenta. Agregá una a tu cuenta en ${ars.cards.length === 0 ? "pesos" : "dólares"}.`}
          >
            <Link href="/cards" className="mt-2 font-serif text-sm text-garnet">
              Ir a tarjetas
            </Link>
          </StateMessage>
        ) : (
          <ExchangeForm arsCards={optionsOf(ars)} usdCards={optionsOf(usd)} />
        )}
      </div>
    </>
  );
}
