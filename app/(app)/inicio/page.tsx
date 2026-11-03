import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchIcon } from "@/components/icons";
import { buttonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StateMessage } from "@/components/ui/state-message";
import { AccountSwitcher } from "@/features/account/account-switcher";
import { BalanceCard } from "@/features/account/balance-card";
import { NotificationsButton } from "@/features/account/notifications-button";
import { QuickActions } from "@/features/account/quick-actions";
import { listAccounts } from "@/features/account/queries";
import { pickSelectedAccount } from "@/features/account/selected-account";
import { getCurrentUser } from "@/features/auth/current-user";
import { MovementList } from "@/features/movements/movement-list";
import { MovementListSkeleton } from "@/features/movements/movement-list-skeleton";
import {
  listRecentMovements,
  RECENT_MOVEMENTS,
} from "@/features/movements/queries";
import { SelectedAccountSkeleton } from "./selected-account-skeleton";

export const metadata: Metadata = { title: "Inicio" };

type SearchParams = PageProps<"/inicio">["searchParams"];

async function Greeting() {
  const user = await getCurrentUser();
  return <h1 className="font-serif text-2xl font-bold">{user.name}</h1>;
}

// Every account of the user, whatever account the switcher shows: each row
// says which card or account the movement went through.
async function RecentMovements() {
  const user = await getCurrentUser();
  const movements = await listRecentMovements(user.id);
  return movements.length > 0 ? (
    <>
      <MovementList movements={movements} />
      <Link href="/movimientos" className={`${buttonClassName} mt-4 w-full`}>
        Consultar todos
      </Link>
    </>
  ) : (
    <StateMessage
      title="Todavía no tenés movimientos"
      description="Cuando hagas o recibas un pago, lo vas a ver acá."
    />
  );
}

// Reads the URL, so it renders behind Suspense: the shell shared by every
// link to Home cannot depend on `?cuenta=`.
async function SelectedAccount({ searchParams }: { searchParams: SearchParams }) {
  const [user, { cuenta }] = await Promise.all([getCurrentUser(), searchParams]);
  const accounts = await listAccounts(user.id);
  const account = pickSelectedAccount(accounts, cuenta, user.preferredCurrency);

  if (!account) {
    throw new Error(`User ${user.id} has no account.`);
  }

  // The preferred currency goes first, the rest keep their order.
  const currencies = accounts
    .map((a) => a.currency)
    .sort(
      (a, b) =>
        Number(b === user.preferredCurrency) - Number(a === user.preferredCurrency),
    );

  return (
    <>
      {accounts.length > 1 && (
        <div className="mt-4">
          <AccountSwitcher currencies={currencies} selected={account.currency} />
        </div>
      )}

      <div className="mt-4">
        <BalanceCard account={account} holderName={user.name} />
      </div>

      <div className="mt-4">
        <QuickActions />
      </div>
    </>
  );
}

export default function HomePage({ searchParams }: PageProps<"/inicio">) {
  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Hola</p>
          <Suspense fallback={<Skeleton className="h-7 w-28" />}>
            <Greeting />
          </Suspense>
        </div>
        <div className="-mr-2 flex items-center">
          <Link
            href="/movimientos"
            aria-label="Buscar movimientos"
            className="flex size-11 items-center justify-center rounded-full"
          >
            <SearchIcon />
          </Link>
          <NotificationsButton />
        </div>
      </header>

      <Suspense fallback={<SelectedAccountSkeleton />}>
        <SelectedAccount searchParams={searchParams} />
      </Suspense>

      <section className="mt-6">
        <h2 className="mb-4 font-serif text-xl font-bold">
          Últimos movimientos
        </h2>
        <Suspense fallback={<MovementListSkeleton rows={RECENT_MOVEMENTS} />}>
          <RecentMovements />
        </Suspense>
      </section>
    </>
  );
}
