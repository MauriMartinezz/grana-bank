import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { cardOption } from "@/features/exchange/queries";
import { ConfirmTopUpForm } from "@/features/top-ups/confirm-form";
import { formPathFor, readTopUpConfirmation } from "@/features/top-ups/confirmation";
import { getOwnedCard } from "@/features/top-ups/queries";
import { SubeNotice } from "@/features/top-ups/sube-notice";
import { findTopUpMovementByKey, resolveTarget } from "@/features/top-ups/top-up";
import { PROVIDER_NAMES } from "@/features/top-ups/validation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { Balance } from "@/features/account/balance";

export const metadata: Metadata = { title: "Confirmar recarga" };

const TARGET_LABELS = { SUBE: "Tarjeta", PHONE: "Número", DIRECTV: "N.º de cliente" } as const;

// Reads the URL at the top level: the route's loading.tsx is its Suspense
// boundary, so the shared shell never depends on the query string.
export default async function ConfirmTopUpPage({ searchParams }: PageProps<"/recargas/confirmar">) {
  const { kind, provider, target, amount, card, key } = await searchParams;
  const confirmation = readTopUpConfirmation({ kind, provider, target, amount, card, key });
  if ("redirectTo" in confirmation) redirect(confirmation.redirectTo);
  const { idempotencyKey, ...draft } = confirmation;
  const formPath = formPathFor(draft.kind, draft.target);

  const user = await getCurrentUser();
  // Back from the receipt lands here: show the receipt instead of offering
  // to confirm a top-up that already happened.
  const done = await findTopUpMovementByKey(user.id, idempotencyKey);
  if (done) redirect(`/recargas/comprobante/${done}`);

  const [resolved, paying] = await Promise.all([
    resolveTarget(db, user.id, draft.kind, draft.provider, draft.target),
    getOwnedCard(user.id, draft.cardId),
  ]);
  if (!resolved.ok || !paying || paying.account.currency !== "ARS") redirect(formPath);

  const remaining = paying.account.balanceCents - BigInt(draft.amountCents);
  const option = cardOption(paying);
  // Shown in full here so a typo can still be caught; receipts mask it.
  const shownTarget = draft.kind === "DIRECTV" ? draft.target : resolved.label;

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref={formPath} />
        <h1 className="font-serif text-2xl font-bold">Revisá la recarga</h1>
      </header>

      <section className="mt-5 rounded-2xl bg-surface p-6">
        <p className="text-center text-sm text-muted">Vas a cargar</p>
        <p className="mt-1 text-center text-3xl font-semibold">
          {formatMoney(draft.amountCents, "ARS")}
        </p>
        <dl className="mt-6 divide-y divide-line text-sm">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Recarga</dt>
            <dd className="font-medium">{PROVIDER_NAMES[draft.provider]}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">{TARGET_LABELS[draft.kind]}</dt>
            <dd className="text-right font-medium">{shownTarget}</dd>
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
              {remaining < 0 ? "Saldo insuficiente" : <Balance cents={remaining} currency="ARS" />}
            </dd>
          </div>
        </dl>
      </section>

      {draft.kind === "SUBE" && (
        <div className="mt-5">
          <SubeNotice />
        </div>
      )}

      <div className="mt-8 space-y-3">
        <ConfirmTopUpForm draft={draft} idempotencyKey={idempotencyKey} />
        <Link
          href={formPath}
          className="flex min-h-12 items-center justify-center font-serif text-sm text-garnet"
        >
          Modificar recarga
        </Link>
      </div>
    </>
  );
}
