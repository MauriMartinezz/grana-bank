import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { StateMessage } from "@/components/ui/state-message";
import { AccountSwitcher } from "@/features/account/account-switcher";
import { BalanceCard } from "@/features/account/balance-card";
import { NotificationsButton } from "@/features/account/notifications-button";
import { QuickActions } from "@/features/account/quick-actions";
import { listAccounts } from "@/features/account/queries";
import { pickSelectedAccount } from "@/features/account/selected-account";
import { getCurrentUser } from "@/features/auth/current-user";
import { NO_FILTERS } from "@/features/movements/filters";
import { MovementList } from "@/features/movements/movement-list";
import { MovementListSkeleton } from "@/features/movements/movement-list-skeleton";
import type { Currency } from "@/generated/prisma/client";
import { listMovements } from "@/features/movements/queries";
import { SelectedAccountSkeleton } from "./selected-account-skeleton";

const RECENT_MOVEMENTS = 5;

export const metadata: Metadata = { title: "Inicio" };

type SearchParams = PageProps<"/home">["searchParams"];

async function Greeting() {
  const user = await getCurrentUser();
  return <h1 className="font-serif text-2xl font-bold">{user.name}</h1>;
}

async function RecentMovements({
  userId,
  currency,
}: {
  userId: string;
  currency: Currency;
}) {
  const movements = await listMovements(
    userId,
    NO_FILTERS,
    RECENT_MOVEMENTS,
    currency,
  );
  return movements.length > 0 ? (
    <MovementList movements={movements} />
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

      <section className="mt-6">
        <h2 className="mb-4 font-serif text-xl font-bold">
          Últimos movimientos
        </h2>
        <Suspense key={account.id} fallback={<MovementListSkeleton />}>
          <RecentMovements userId={user.id} currency={account.currency} />
        </Suspense>
      </section>
    </>
  );
}

export default function HomePage({ searchParams }: PageProps<"/home">) {
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
            href="/movements"
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
    </>
  );
}
