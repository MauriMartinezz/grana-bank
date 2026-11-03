import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { BackButton } from "@/components/ui/back-button";
import { buttonClassName } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/state-message";
import { getCurrentUser } from "@/features/auth/current-user";
import { listSubeCards } from "@/features/top-ups/queries";
import { maskDigits } from "@/features/top-ups/validation";

export const metadata: Metadata = { title: "Tarjetas SUBE" };

export default async function SubeCardsPage() {
  const user = await getCurrentUser();
  const cards = await listSubeCards(user.id);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/recargas" />
        <h1 className="font-serif text-2xl font-bold">Tarjetas SUBE</h1>
      </header>

      <Link href="/recargas/sube/nueva" className={`${buttonClassName} mt-5 w-full gap-2`}>
        <PlusIcon className="size-5" />
        Agregar tarjeta SUBE
      </Link>

      <div className="mt-6">
        {cards.length > 0 ? (
          <ul aria-label="Tus tarjetas SUBE" className="space-y-px overflow-hidden rounded-2xl">
            {cards.map((card) => (
              <li key={card.id}>
                <Link
                  href={`/recargas/sube/${card.id}`}
                  aria-label={`Recargar ${card.nickname}, terminada en ${card.number.slice(-4)}`}
                  className="flex items-center justify-between gap-3 bg-surface p-4 transition-colors hover:bg-surface/70 active:bg-surface/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{card.nickname}</span>
                    <span className="block text-sm tracking-wide text-muted">
                      {maskDigits(card.number)}
                    </span>
                  </span>
                  <span className="font-serif text-sm text-garnet">Recargar</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <StateMessage
            title="Todavía no tenés tarjetas SUBE"
            description="Agregá tu tarjeta SUBE con un nombre para reconocerla y recargala cuando quieras."
          />
        )}
      </div>
    </>
  );
}
