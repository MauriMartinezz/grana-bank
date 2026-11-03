import Link from "next/link";
import { getCurrentUser } from "@/features/auth/current-user";
import { formatMoney } from "@/lib/format";
import { COMPANY_INFO } from "./companies";
import { dueLabel } from "./due-date";
import { listUpcomingBills } from "./queries";

/**
 * Home's reminder of the bills nothing pays by itself, with `Vence en N días`.
 * Renders nothing when there are none.
 */
export async function UpcomingBills() {
  const user = await getCurrentUser();
  const bills = await listUpcomingBills(user.id);
  if (bills.length === 0) return null;
  // Read after the session, so the section is rendered per request.
  const now = new Date();

  return (
    <section aria-labelledby="upcoming-bills" className="mt-6">
      <h2 id="upcoming-bills" className="mb-4 font-serif text-xl font-bold">
        Próximos vencimientos
      </h2>
      <ul className="space-y-px overflow-hidden rounded-2xl">
        {bills.map((bill) => {
          const label = dueLabel(bill.dueDate, now);
          return (
            <li key={bill.id}>
              <Link
                href={`/servicios/pagar/${bill.id}`}
                className="flex items-center justify-between gap-3 bg-surface p-4 transition-colors hover:bg-surface/70 active:bg-surface/60"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{bill.adhesion.nickname}</span>
                  <span className="block text-sm text-muted">
                    {COMPANY_INFO[bill.adhesion.company].name}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm">
                  <span className="block font-medium">
                    {formatMoney(bill.amountCents, bill.currency)}
                  </span>
                  <span className={`block ${label === "Vencida" ? "text-garnet" : "text-muted"}`}>
                    {label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
