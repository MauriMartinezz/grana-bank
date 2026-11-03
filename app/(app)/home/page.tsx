import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { StateMessage } from "@/components/ui/state-message";
import { BalanceCard } from "@/features/account/balance-card";
import { NotificationsButton } from "@/features/account/notifications-button";
import { QuickActions } from "@/features/account/quick-actions";
import { listAccounts } from "@/features/account/queries";
import { getCurrentUser } from "@/features/auth/current-user";
import { NO_FILTERS } from "@/features/movements/filters";
import { MovementList } from "@/features/movements/movement-list";
import { listMovements } from "@/features/movements/queries";

const RECENT_MOVEMENTS = 5;

export const metadata: Metadata = { title: "Inicio" };

export default async function HomePage() {
  const user = await getCurrentUser();
  const [accounts, movements] = await Promise.all([
    listAccounts(user.id),
    listMovements(user.id, NO_FILTERS, RECENT_MOVEMENTS),
  ]);
  // One account for now: the preferred currency, else the first one.
  const account =
    accounts.find((a) => a.currency === user.preferredCurrency) ?? accounts[0];

  if (!account) {
    throw new Error(`User ${user.id} has no account.`);
  }

  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Hola</p>
          <h1 className="font-serif text-2xl font-bold">{user.name}</h1>
        </div>
        <div className="-mr-2 flex items-center">
          <Link
            href="/movements"
            aria-label="Buscar movimientos"
            className="flex size-11 items-center justify-center rounded-full"
          >
            <SearchIcon />
          </Link>
          <NotificationsButton />
        </div>
      </header>

      <div className="mt-4">
        <BalanceCard account={account} />
      </div>

      <div className="mt-4">
        <QuickActions />
      </div>

      <section className="mt-6">
        <h2 className="mb-4 font-serif text-xl font-bold">
          Últimos movimientos
        </h2>
        {movements.length > 0 ? (
          <MovementList movements={movements} />
        ) : (
          <StateMessage
            title="Todavía no tenés movimientos"
            description="Cuando hagas o recibas un pago, lo vas a ver acá."
          />
        )}
      </section>
    </>
  );
}
