import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { ConfirmExchangeForm } from "@/features/exchange/confirm-form";
import { readExchangeConfirmation } from "@/features/exchange/confirmation";
import { findExchangeMovementByKey, SIDES } from "@/features/exchange/exchange";
import { cardOption, getOwnedCards } from "@/features/exchange/queries";
import { ARS_PER_USD, usdToArsCents } from "@/features/exchange/rate";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Confirmar operación" };

// Reads the URL at the top level: the route's loading.tsx is its Suspense
// boundary, so the shared shell never depends on the query string.
export default async function ConfirmExchangePage({
  searchParams,
}: PageProps<"/dolares/confirmar">) {
  const { direction, usd, from, to, key } = await searchParams;
  const confirmation = readExchangeConfirmation({ direction, usd, from, to, key });
  if ("redirectTo" in confirmation) redirect(confirmation.redirectTo);
  const { usdCents, fromCardId, toCardId, idempotencyKey } = confirmation;

  const user = await getCurrentUser();
  // Back from the success screen lands here: show the receipt instead of
  // offering to confirm an exchange that already happened.
  const done = await findExchangeMovementByKey(user.id, idempotencyKey);
  if (done) redirect(`/dolares/comprobante/${done}`);

  const cards = await getOwnedCards(user.id, [fromCardId, toCardId]);
  const fromCard = cards.find((card) => card.id === fromCardId);
  const toCard = cards.find((card) => card.id === toCardId);
  const sides = SIDES[confirmation.direction];
  if (
    !fromCard ||
    !toCard ||
    fromCard.account.currency !== sides.from ||
    toCard.account.currency !== sides.to
  ) {
    redirect("/dolares");
  }

  const buying = confirmation.direction === "BUY";
  const arsCents = usdToArsCents(usdCents);
  const debitCents = buying ? arsCents : BigInt(usdCents);
  const remaining = fromCard.account.balanceCents - debitCents;
  const paying = cardOption(fromCard);
  const receiving = cardOption(toCard);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/dolares" />
        <h1 className="font-serif text-2xl font-bold">
          {buying ? "Revisá la compra" : "Revisá la venta"}
        </h1>
      </header>

      <section className="mt-5 rounded-2xl bg-surface p-6">
        <p className="text-center text-sm text-muted">
          {buying ? "Vas a comprar" : "Vas a vender"}
        </p>
        <p className="mt-1 text-center text-3xl font-semibold">{formatMoney(usdCents, "USD")}</p>
        <p className="mt-1 text-center text-sm text-muted">
          {buying ? "Pagás" : "Recibís"} {formatMoney(arsCents, "ARS")}
        </p>
        <dl className="mt-6 divide-y divide-line text-sm">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Cotización</dt>
            <dd className="font-medium">1 USD = {formatMoney(ARS_PER_USD * 100, "ARS")}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Debitamos de</dt>
            <dd className="text-right">
              <span className="block font-medium">{paying.label}</span>
              <span className="block text-muted">{paying.detail}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Acreditamos en</dt>
            <dd className="text-right">
              <span className="block font-medium">{receiving.label}</span>
              <span className="block text-muted">{receiving.detail}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Saldo después</dt>
            <dd className={`font-medium ${remaining < 0 ? "text-garnet" : ""}`}>
              {remaining < 0
                ? "Saldo insuficiente"
                : formatMoney(remaining, fromCard.account.currency)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 space-y-3">
        <ConfirmExchangeForm
          direction={confirmation.direction}
          usdCents={usdCents}
          fromCardId={fromCardId}
          toCardId={toCardId}
          idempotencyKey={idempotencyKey}
        />
        <Link
          href="/dolares"
          className="flex min-h-12 items-center justify-center font-serif text-sm text-garnet"
        >
          Modificar operación
        </Link>
      </div>
    </>
  );
}
