import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { nextDepositDate, scheduleText } from "@/features/deposits/schedule";
import { formatDueDate } from "@/features/services/due-date";
import { getSubeCard } from "@/features/top-ups/queries";
import { deleteTopUpSchedule } from "@/features/top-ups/schedule-actions";
import { TopUpScheduleForm } from "@/features/top-ups/schedule-form";
import { listTopUpSchedules } from "@/features/top-ups/schedule-queries";
import { formatMoney } from "@/lib/format";
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
  const schedules = await listTopUpSchedules(user.id, card.id);
  const now = new Date();

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

      <section aria-labelledby="scheduled-top-ups" className="mt-8">
        <h2 id="scheduled-top-ups" className="font-serif text-lg font-bold">
          Recarga programada
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted">
          Cargá esta tarjeta todas las semanas o todos los meses.{" "}
          <span className="font-medium text-ink">Es una demo:</span> se guarda, pero no se carga
          saldo.
        </p>
        {schedules.length > 0 && (
          <ul aria-label="Recargas programadas" className="mb-4 space-y-px overflow-hidden rounded-2xl">
            {schedules.map((schedule) => (
              <li key={schedule.id} className="flex items-center justify-between gap-3 bg-surface p-4">
                <span className="min-w-0">
                  <span className="block font-medium">{formatMoney(schedule.amountCents, "ARS")}</span>
                  <span className="block text-sm text-muted">
                    {scheduleText(schedule.frequency, schedule.day)}
                  </span>
                  <span className="block text-xs text-muted">
                    Próxima: {formatDueDate(nextDepositDate(schedule.frequency, schedule.day, now))}
                  </span>
                </span>
                <form action={deleteTopUpSchedule}>
                  <input type="hidden" name="scheduleId" value={schedule.id} />
                  <button type="submit" className="min-h-11 shrink-0 font-serif text-sm text-garnet">
                    Borrar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <TopUpScheduleForm subeCardId={card.id} />
      </section>
    </>
  );
}
