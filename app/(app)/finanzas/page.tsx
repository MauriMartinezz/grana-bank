import type { Metadata } from "next";
import Link from "next/link";
import { BackIcon } from "@/components/icons";
import { BackButton } from "@/components/ui/back-button";
import { StateMessage } from "@/components/ui/state-message";
import { AccountSwitcher } from "@/features/account/account-switcher";
import { listAccounts } from "@/features/account/queries";
import { accountParam, pickSelectedAccount } from "@/features/account/selected-account";
import { getCurrentUser } from "@/features/auth/current-user";
import { listCategories } from "@/features/categories/categories";
import { AddBudgetForm } from "@/features/finances/budget-forms";
import { addMonths, currentMonth, formatMonth, parseMonth } from "@/features/finances/month";
import { listBudgets, listMonthMovements } from "@/features/finances/queries";
import {
  Bar,
  budgetPercent,
  BudgetStatusBadge,
  ConversionGroups,
  SpendingGroups,
} from "@/features/finances/spending-groups";
import { budgetStatus, summarizeMonth } from "@/features/finances/summary";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Finanzas personales" };

const MONTH_LINK = "flex size-11 items-center justify-center rounded-full bg-surface";

// Reads the URL at the top level: the route's loading.tsx is its Suspense boundary.
export default async function FinancesPage({ searchParams }: PageProps<"/finanzas">) {
  const [{ cuenta, mes }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const now = new Date();
  const accounts = await listAccounts(user.id);
  const account = pickSelectedAccount(accounts, cuenta, user.preferredCurrency);
  if (!account) {
    throw new Error(`User ${user.id} has no account.`);
  }
  const { currency } = account;
  const month = parseMonth(mes, now);
  const isCurrentMonth = month === currentMonth(now);

  const [movements, budgets, categories] = await Promise.all([
    listMonthMovements(user.id, currency, month),
    listBudgets(user.id, currency),
    listCategories(user.id),
  ]);
  const overview = summarizeMonth(movements, budgets);
  const summary = overview.expenses;
  const budgeted = new Set(budgets.map((budget) => budget.categoryId));
  const unbudgeted = categories.filter((category) => !budgeted.has(category.id));

  // The preferred currency goes first, the rest keep their order, like Home.
  const currencies = accounts
    .map((a) => a.currency)
    .sort((a, b) => Number(b === user.preferredCurrency) - Number(a === user.preferredCurrency));
  const monthHref = (target: string) =>
    `/finanzas?cuenta=${accountParam(currency)}&mes=${target}`;
  const monthName = formatMonth(month);

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/inicio" />
        <h1 className="font-serif text-2xl font-bold">Finanzas personales</h1>
      </header>
      <p className="mt-2 text-sm text-muted">
        En qué gastaste, cuánto y cuándo, por categoría. Solo lo ves vos.
      </p>

      {accounts.length > 1 && (
        <div className="mt-4">
          <AccountSwitcher currencies={currencies} selected={currency} />
        </div>
      )}

      <nav aria-label="Elegí el mes" className="mt-4 flex items-center justify-between gap-2">
        <Link
          href={monthHref(addMonths(month, -1))}
          aria-label={`Ver ${formatMonth(addMonths(month, -1))}`}
          className={MONTH_LINK}
        >
          <BackIcon />
        </Link>
        <p aria-current="date" className="font-serif text-lg font-bold">
          {monthName}
        </p>
        {isCurrentMonth ? (
          <span aria-hidden="true" className="size-11" />
        ) : (
          <Link
            href={monthHref(addMonths(month, 1))}
            aria-label={`Ver ${formatMonth(addMonths(month, 1))}`}
            className={MONTH_LINK}
          >
            <BackIcon className="rotate-180" />
          </Link>
        )}
      </nav>

      <section aria-label="Resumen del mes" className="mt-4 rounded-2xl bg-surface p-5">
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="text-sm text-muted">Ingresos</dt>
            <dd className="mt-1 font-serif text-lg font-bold">
              {formatMoney(overview.incomeCents, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Gastos</dt>
            <dd className="mt-1 font-serif text-lg font-bold">
              {formatMoney(summary.totalCents, currency)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Diferencia</dt>
            <dd className="mt-1 font-serif text-lg font-bold">
              {formatMoney(overview.balanceCents, currency)}
            </dd>
          </div>
        </dl>
        {summary.budgeted && (
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                Presupuestado {formatMoney(summary.budgeted.budgetCents, currency)} · Gastado{" "}
                {formatMoney(summary.budgeted.spentCents, currency)}
              </span>
              <BudgetStatusBadge
                status={budgetStatus(summary.budgeted.spentCents, summary.budgeted.budgetCents)}
                currency={currency}
              />
            </p>
            <Bar
              percent={budgetPercent(summary.budgeted.spentCents, summary.budgeted.budgetCents)}
              className={
                summary.budgeted.spentCents > summary.budgeted.budgetCents
                  ? "bg-yellow"
                  : "bg-garnet-fill"
              }
            />
          </div>
        )}
      </section>

      <section aria-labelledby="gastos" className="mt-6">
        <h2 id="gastos" className="mb-3 font-serif text-xl font-bold">
          En qué gastaste
        </h2>
        {summary.totalCents === BigInt(0) && (
          <div className="mb-3">
            <StateMessage
              title={`No tenés gastos en ${monthName}`}
              description={`Cuando pagues, transfieras o recargues desde tu cuenta en ${currency}, lo vas a ver acá agrupado por categoría.`}
            />
          </div>
        )}
        {summary.groups.length > 0 && (
          <SpendingGroups groups={summary.groups} currency={currency} />
        )}
      </section>

      {overview.conversions.length > 0 && (
        <section aria-labelledby="conversiones" className="mt-6">
          <h2 id="conversiones" className="font-serif text-xl font-bold">
            Conversión
          </h2>
          <p className="mt-1 mb-3 text-sm text-muted">
            Compras y ventas de dólares: no cuentan como gastos ni como ingresos.
          </p>
          <ConversionGroups groups={overview.conversions} />
        </section>
      )}

      {unbudgeted.length > 0 && (
        <section aria-labelledby="presupuestos" className="mt-6">
          <h2 id="presupuestos" className="font-serif text-xl font-bold">
            Definí un presupuesto
          </h2>
          <p className="mt-1 mb-3 text-sm text-muted">
            Elegí cuánto querés gastar por mes en una categoría y mirá cuánto te queda disponible.
            Vale para todos los meses hasta que lo cambies.
          </p>
          <AddBudgetForm categories={unbudgeted} currency={currency} />
        </section>
      )}
    </>
  );
}
