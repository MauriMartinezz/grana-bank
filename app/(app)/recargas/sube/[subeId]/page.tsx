import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { getSubeCard } from "@/features/top-ups/queries";
import { TopUpPayment } from "@/features/top-ups/top-up-payment";
import { formatSubeNumber } from "@/features/top-ups/validation";

export const metadata: Metadata = { title: "Recargar SUBE" };

// Reads the URL at the top level: the route's loading.tsx is its Suspense
// boundary, so the shared shell never depends on the params.
export default async function SubeTopUpPage({ params }: PageProps<"/recargas/sube/[subeId]">) {
  const { subeId } = await params;
  const user = await getCurrentUser();
  const card = await getSubeCard(user.id, subeId);
  if (!card) notFound();

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/recargas/sube" />
        <h1 className="font-serif text-2xl font-bold">Recargar SUBE</h1>
      </header>

      <section aria-label="Tarjeta a recargar" className="mt-5 mb-6 rounded-2xl bg-surface p-5">
        <p className="font-medium">{card.nickname}</p>
        <p className="mt-1 text-sm tracking-wide text-muted">{formatSubeNumber(card.number)}</p>
      </section>

      <TopUpPayment userId={user.id} kind="SUBE" subeCardId={card.id} />
    </>
  );
}
