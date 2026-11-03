import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getAccount } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { ConfirmDepositForm } from "@/features/deposits/confirm-deposit-form";
import { findTestAccount } from "@/features/deposits/deposit";
import { readDepositConfirmation } from "@/features/deposits/test-account";
import { formatMoney } from "@/lib/format";
import { Balance } from "@/features/account/balance";

export const metadata: Metadata = { title: "Confirmar ingreso" };

export default async function ConfirmDepositPage({
  searchParams,
}: PageProps<"/ingresar-dinero/confirmar">) {
  const { currency, amount, key } = await searchParams;
  const confirmation = readDepositConfirmation(currency, amount, key);
  if (!confirmation) redirect("/ingresar-dinero");

  const user = await getCurrentUser();
  const [account, source] = await Promise.all([
    getAccount(user.id, confirmation.currency),
    findTestAccount(confirmation.currency),
  ]);
  if (!account || !source) redirect("/ingresar-dinero");
  const after = account.balanceCents + BigInt(confirmation.amountCents);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/ingresar-dinero" />
        <h1 className="font-serif text-2xl font-bold">Revisá el ingreso</h1>
      </header>

      <section className="mt-5 rounded-2xl bg-surface p-6">
        <p className="text-center text-sm text-muted">Vas a ingresar</p>
        <p className="mt-1 text-center text-3xl font-semibold">
          {formatMoney(confirmation.amountCents, account.currency)}
        </p>
        <dl className="mt-6 divide-y divide-line text-sm">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Desde</dt>
            <dd className="text-right font-medium">
              {source.name} · {source.alias}
            </dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">A tu cuenta</dt>
            <dd className="text-right font-medium">{account.alias}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Saldo después</dt>
            <dd className="text-right font-medium"><Balance cents={after} currency={account.currency} /></dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 space-y-3">
        <ConfirmDepositForm {...confirmation} />
        <Link
          href="/ingresar-dinero"
          className="flex min-h-12 items-center justify-center font-serif text-sm text-garnet"
        >
          Modificar monto
        </Link>
      </div>
    </>
  );
}
