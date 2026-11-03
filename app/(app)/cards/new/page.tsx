import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { CardForm } from "@/features/cards/card-form";
import { listCardAccounts } from "@/features/cards/queries";

export const metadata: Metadata = { title: "Agregar tarjeta" };

export default async function NewCardPage() {
  const user = await getCurrentUser();
  const accounts = await listCardAccounts(user.id);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/cards" />
        <h1 className="font-serif text-2xl font-bold">Agregar tarjeta</h1>
      </header>
      <p className="mt-2 text-sm text-muted">
        Elegí la cuenta: la tarjeta va a operar en la moneda de esa cuenta.
      </p>

      <div className="mt-6">
        {accounts.length > 0 ? (
          <CardForm accounts={accounts} />
        ) : (
          <StateMessage
            title="No tenés cuentas"
            description="Necesitás una cuenta para agregar una tarjeta."
          />
        )}
      </div>
    </>
  );
}
