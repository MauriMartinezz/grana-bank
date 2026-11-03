import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { listAccounts } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { ACCOUNT_LABELS } from "@/features/cards/account-label";
import { nextDepositDate, scheduleText } from "@/features/deposits/schedule";
import { deleteDepositSchedule } from "@/features/deposits/schedule-actions";
import { ScheduleDepositForm } from "@/features/deposits/schedule-form";
import { listDepositSchedules } from "@/features/deposits/schedule-queries";
import { formatDueDate } from "@/features/services/due-date";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Programar ingresos" };

export default async function ScheduleDepositsPage() {
  const user = await getCurrentUser();
  const [accounts, schedules] = await Promise.all([
    listAccounts(user.id),
    listDepositSchedules(user.id),
  ]);
  const now = new Date();

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/ingresar-dinero" />
        <h1 className="font-serif text-2xl font-bold">Programar ingresos</h1>
      </header>
      <p className="mt-2 mb-6 rounded-2xl bg-surface p-4 text-sm text-muted">
        Elegí un día de la semana o del mes para que te ingrese dinero automáticamente desde la
        cuenta de prueba. <span className="font-medium text-ink">Es una demo:</span> la programación
        se guarda, pero no se ingresa dinero.
      </p>

      <ScheduleDepositForm
        accounts={accounts.map((account) => ({
          currency: account.currency,
          label: ACCOUNT_LABELS[account.currency],
        }))}
      />

      {schedules.length > 0 && (
        <section aria-labelledby="schedules" className="mt-8">
          <h2 id="schedules" className="mb-3 font-serif text-lg font-bold">
            Tus ingresos programados
          </h2>
          <ul className="space-y-px overflow-hidden rounded-2xl">
            {schedules.map((schedule) => (
              <li
                key={schedule.id}
                className="flex items-center justify-between gap-3 bg-surface p-4"
              >
                <span className="min-w-0">
                  <span className="block font-medium">
                    {formatMoney(schedule.amountCents, schedule.currency)}
                  </span>
                  <span className="block text-sm text-muted">
                    {scheduleText(schedule.frequency, schedule.day)}
                  </span>
                  <span className="block text-xs text-muted">
                    Próximo: {formatDueDate(nextDepositDate(schedule.frequency, schedule.day, now))}
                  </span>
                </span>
                <form action={deleteDepositSchedule}>
                  <input type="hidden" name="scheduleId" value={schedule.id} />
                  <button type="submit" className="min-h-11 shrink-0 font-serif text-sm text-garnet">
                    Borrar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
