import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { getAccount } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { listCategories } from "@/features/categories/categories";
import { AmountForm } from "@/features/transfers/amount-form";
import { getRecipient } from "@/features/transfers/contacts";
import { RecipientSummary } from "@/features/transfers/recipient-summary";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Monto a transferir" };

export default async function TransferAmountPage({
  params,
}: PageProps<"/transferir/[cuentaId]">) {
  const { cuentaId: accountId } = await params;
  const user = await getCurrentUser();
  const recipient = await getRecipient(user.id, accountId);
  if (!recipient) notFound();
  // The money leaves the sender's account in the recipient's currency.
  const [account, categories] = await Promise.all([
    getAccount(user.id, recipient.currency),
    listCategories(user.id),
  ]);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/transferir" />
        <h1 className="font-serif text-2xl font-bold">¿Cuánto querés transferir?</h1>
      </header>

      <div className="mt-5">
        <RecipientSummary recipient={recipient} />
      </div>

      {account ? (
        <>
          <p className="mt-6 text-sm text-muted">
            Disponible: {formatMoney(account.balanceCents, account.currency)}
          </p>
          <div className="mt-2">
            <AmountForm
              recipientAccountId={recipient.accountId}
              currency={account.currency}
              categories={categories}
            />
          </div>
        </>
      ) : (
        <div className="mt-6">
          <StateMessage
            title="No tenés una cuenta en esa moneda."
            description={`Esta cuenta es en ${recipient.currency}: solo podés transferirle desde una cuenta en la misma moneda.`}
          />
        </div>
      )}
    </>
  );
}
