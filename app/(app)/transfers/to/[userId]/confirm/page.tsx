import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getAccount } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { MAX_TRANSFER_CENTS } from "@/features/transfers/amount";
import { ConfirmForm } from "@/features/transfers/confirm-form";
import { getRecipient } from "@/features/transfers/contacts";
import { findSentMovementByKey } from "@/features/transfers/transfer";
import { RecipientSummary } from "@/features/transfers/recipient-summary";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Confirmar transferencia" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCents(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d{1,12}$/.test(value)) return null;
  const cents = Number(value);
  return cents > 0 && cents <= MAX_TRANSFER_CENTS ? cents : null;
}

export default async function ConfirmTransferPage({
  params,
  searchParams,
}: PageProps<"/transfers/to/[userId]/confirm">) {
  const [{ userId }, { amount, key }] = await Promise.all([params, searchParams]);
  const amountCents = parseCents(amount);
  if (amountCents === null) redirect(`/transfers/to/${userId}`);
  // The amount step creates the key; without a valid one, start a fresh
  // confirmation so the key never changes between renders of this URL.
  if (typeof key !== "string" || !UUID_PATTERN.test(key)) {
    redirect(`/transfers/to/${userId}/confirm?amount=${amountCents}&key=${randomUUID()}`);
  }
  const idempotencyKey = key.toLowerCase();

  const user = await getCurrentUser();
  // Back from the success screen lands here: show the receipt instead of
  // offering to confirm a transfer that already happened.
  const done = await findSentMovementByKey(user.id, idempotencyKey);
  if (done) redirect(`/transfers/success/${done}`);

  const [recipient, account] = await Promise.all([
    getRecipient(user.id, userId),
    getAccount(user.id),
  ]);
  if (!recipient) notFound();
  if (!account) throw new Error(`User ${user.id} has no account.`);

  const remaining = account.balanceCents - amountCents;

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref={`/transfers/to/${userId}`} />
        <h1 className="font-serif text-2xl font-bold">Revisá la transferencia</h1>
      </header>

      <div className="mt-5">
        <RecipientSummary recipient={recipient} />
      </div>

      <section className="mt-4 rounded-2xl bg-white p-6">
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
        </dl>
      </section>

      <div className="mt-8 space-y-3">
        <ConfirmForm
          recipientId={recipient.userId}
          amountCents={amountCents}
          idempotencyKey={idempotencyKey}
        />
        <Link
          href={`/transfers/to/${userId}`}
          className="flex min-h-12 items-center justify-center font-serif text-sm text-garnet"
        >
          Modificar monto
        </Link>
      </div>
    </>
  );
}
