import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { CardDetails } from "@/features/cards/card-details";
import { getOwnCard } from "@/features/cards/queries";
import { MovementList } from "@/features/movements/movement-list";
import { listCardMovements } from "@/features/movements/queries";

export const metadata: Metadata = { title: "Detalle de la tarjeta" };

export default async function CardDetailPage({ params }: PageProps<"/cards/[cardId]">) {
  const { cardId } = await params;
  const user = await getCurrentUser();
  // Both queries are scoped to the user, so they can run together.
  const [card, movements] = await Promise.all([
    getOwnCard(user.id, cardId),
    listCardMovements(user.id, cardId),
  ]);

  if (!card) {
    notFound();
  }

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/cards" />
        <h1 className="font-serif text-2xl font-bold">Tarjeta</h1>
      </header>

      <div className="mt-5">
        <CardDetails card={card} />
      </div>

      <section aria-labelledby="card-movements" className="mt-8">
        <h2 id="card-movements" className="mb-3 font-serif text-lg font-bold">
          Movimientos con esta tarjeta
        </h2>
        {movements.length > 0 ? (
          <MovementList movements={movements} />
        ) : (
          <StateMessage
            title="Sin movimientos"
            description="Todavía no hay movimientos con esta tarjeta."
          />
        )}
      </section>
    </>
  );
}
