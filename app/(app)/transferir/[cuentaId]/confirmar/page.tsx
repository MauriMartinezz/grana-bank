import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getAccount } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { listCategories } from "@/features/categories/categories";
import { ConfirmForm } from "@/features/transfers/confirm-form";
import { readConfirmation, readTransferExtras } from "@/features/transfers/confirmation";
import { getRecipient, isContact } from "@/features/transfers/contacts";
import { findSentMovementByKey } from "@/features/transfers/transfer";
import { RecipientSummary } from "@/features/transfers/recipient-summary";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Confirmar transferencia" };

export default async function ConfirmTransferPage({
  params,
  searchParams,
}: PageProps<"/transferir/[cuentaId]/confirmar">) {
  const [{ cuentaId: accountId }, { amount, key, note: rawNote, category }] = await Promise.all([
    params,
    searchParams,
  ]);
  const confirmation = readConfirmation(accountId, amount, key);
  if ("redirectTo" in confirmation) redirect(confirmation.redirectTo);
  const { amountCents, idempotencyKey } = confirmation;
  const extras = readTransferExtras(rawNote, category);
  if (!extras) redirect(`/transferir/${accountId}`);
  const { note, categoryId } = extras;

  const user = await getCurrentUser();
  // Back from the success screen lands here: show the receipt instead of
  // offering to confirm a transfer that already happened.
  const done = await findSentMovementByKey(user.id, idempotencyKey);
  if (done) redirect(`/transferir/comprobante/${done}`);

  const recipient = await getRecipient(user.id, accountId);
  if (!recipient) notFound();
  // Without an account in this currency, the amount step explains why.
  const [account, saved, categories] = await Promise.all([
    getAccount(user.id, recipient.currency),
    isContact(user.id, recipient.accountId),
    listCategories(user.id),
  ]);
  if (!account) redirect(`/transferir/${accountId}`);
  // Only the user's own category; another id sends them back to pick again.
  const categoryName = categoryId
    ? categories.find((c) => c.id === categoryId)?.name
    : null;
  if (categoryName === undefined) redirect(`/transferir/${accountId}`);

  const remaining = account.balanceCents - BigInt(amountCents);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref={`/transferir/${accountId}`} />
        <h1 className="font-serif text-2xl font-bold">Revisá la transferencia</h1>
      </header>

      <div className="mt-5">
        <RecipientSummary recipient={recipient} />
      </div>

      <section className="mt-4 rounded-2xl bg-surface p-6">
        <p className="text-center text-sm text-muted">Vas a transferir</p>
        <p className="mt-1 text-center text-3xl font-semibold">
          {formatMoney(amountCents, account.currency)}
        </p>
        <dl className="mt-6 divide-y divide-line text-sm">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Saldo actual</dt>
            <dd className="font-medium">
              {formatMoney(account.balanceCents, account.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Saldo después</dt>
            <dd className={`font-medium ${remaining < 0 ? "text-garnet" : ""}`}>
              {remaining < 0
                ? "Saldo insuficiente"
                : formatMoney(remaining, account.currency)}
            </dd>
          </div>
          {note && (
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted">Nota</dt>
              <dd className="min-w-0 text-right font-medium break-words">{note}</dd>
            </div>
          )}
          {categoryName && (
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-muted">Categoría</dt>
              <dd className="text-right font-medium">{categoryName}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="mt-8 space-y-3">
        <ConfirmForm
          recipientAccountId={recipient.accountId}
          amountCents={amountCents}
          idempotencyKey={idempotencyKey}
          note={note}
          categoryId={categoryId}
          saveContactName={saved ? null : recipient.name}
        />
        <Link
          href={`/transferir/${accountId}`}
          className="flex min-h-12 items-center justify-center font-serif text-sm text-garnet"
        >
          Modificar monto
        </Link>
      </div>
    </>
  );
}
