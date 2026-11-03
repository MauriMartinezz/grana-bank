import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { BackButton } from "@/components/ui/back-button";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { CardList } from "@/features/cards/card-list";
import { listCardsByAccount } from "@/features/cards/queries";

export const metadata: Metadata = { title: "Mis tarjetas" };

export default async function CardsPage() {
  const user = await getCurrentUser();
  const accounts = await listCardsByAccount(user.id);
  const hasCards = accounts.some((account) => account.cards.length > 0);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/inicio" />
        <h1 className="font-serif text-2xl font-bold">Mis tarjetas</h1>
      </header>

      <Link href="/tarjetas/nueva" className={`${buttonClassName} mt-5 w-full gap-2`}>
        <PlusIcon className="size-5" />
        Agregar tarjeta
      </Link>

      <div className="mt-6">
        {hasCards ? (
          <CardList accounts={accounts} />
        ) : (
          <StateMessage
            title="Todavía no tenés tarjetas"
            description="Agregá una tarjeta Visa, Mastercard o American Express para verla acá."
          />
        )}
      </div>
    </>
  );
}
