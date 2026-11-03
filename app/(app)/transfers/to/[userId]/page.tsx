import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getAccount } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { reviewAmount } from "@/features/transfers/actions";
import { getRecipient } from "@/features/transfers/contacts";
import { FieldForm } from "@/features/transfers/field-form";
import { RecipientSummary } from "@/features/transfers/recipient-summary";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Monto a transferir" };

export default async function TransferAmountPage({
  params,
}: PageProps<"/transfers/to/[userId]">) {
  const { userId } = await params;
  const user = await getCurrentUser();
  const [recipient, account] = await Promise.all([
    getRecipient(user.id, userId),
    getAccount(user.id),
  ]);

  if (!recipient) notFound();
  if (!account) throw new Error(`User ${user.id} has no account.`);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/transfers" />
        <h1 className="font-serif text-2xl font-bold">¿Cuánto querés transferir?</h1>
      </header>

      <div className="mt-5">
        <RecipientSummary recipient={recipient} />
      </div>

      <p className="mt-6 text-sm text-muted">
        Disponible: {formatMoney(account.balanceCents, account.currency)}
      </p>
      <div className="mt-2">
        <FieldForm
          action={reviewAmount}
          label={`Monto en ${account.currency}`}
          name="amount"
          hidden={{ recipientId: recipient.userId }}
          submitLabel="Continuar"
          pendingLabel="Validando…"
          input={{ inputMode: "decimal", autoComplete: "off", placeholder: "0,00" }}
        />
      </div>
    </>
  );
}
