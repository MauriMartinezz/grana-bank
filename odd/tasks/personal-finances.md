# Personal finances

Objective: a "Finanzas Personales" screen, reachable from a Home quick action, showing what the user spent on, how much, and when, grouped by category.
Branch: `chore/rebrand-vuelto` (uncommitted work in progress; no commits until the user decides). Delivery strategy: `ask-on-risk`. Test runner: Vitest (`pnpm test`; DB tests need the docker Postgres on 5433).

## Specs

- S1. "Bien, hay que trabajar en una nueva sección que tendrá su acceso rápido en el home y es la pantalla de Finanzas Personales: En ella se podrán ver en qué se gastó y cuánto, en qué y cuándo: si un gasto no tiene categoría estará bajo el tag Sin categoría, si la transferencia, pago, etc tiene categoría se agrupará con ella"
  - Assumption: a new route `/finanzas` titled "Finanzas personales", and a new Home quick action (label one word, e.g. "Finanzas") in `features/account/quick-actions.tsx`.
  - (Rewritten per L4.) A "gasto" is every movement that takes money out of the account, except currency conversions: today `SENT`, `SUBSCRIPTION`, `TOP_UP`, `SERVICE_PAYMENT`. Classify by money direction in one place (a single helper mapping each `MovementType` to gasto / ingreso / conversión), so a new outgoing type defaults to gasto.
  - (L4) `RECEIVED` counts as "Ingreso": the month summary shows total Ingresos, total Gastos and the difference, in the selected currency. Ingresos are not mixed into the category groups of gastos.
  - (L4) `EXCHANGE` (dollar buy/sell, both sides) counts as "Conversión": shown in its own section, never in gastos or ingresos. Assumption for "quizá existe la opción de ponerle la etiqueta de Ahorro": a conversion movement can already carry one of the user's categories (existing movement category form); if it has one (e.g. a category the user names "Ahorro"), the Conversión section shows it under that category's name, otherwise under "Conversión". No new category is auto-created.
  - Assumption: amounts are never mixed across currencies. The screen works on one currency at a time with the same `?cuenta=` account switcher Home uses (`AccountSwitcher`, `pickSelectedAccount`, user's preferred currency by default).
  - Assumption: the period is one calendar month in Buenos Aires time, chosen with `?mes=YYYY-MM` (default: the current month), with previous/next month navigation; no navigation past the current month. Invalid `mes` falls back to the current month.
  - "en qué y cuánto": a total spent for the month, then one group per category, ordered by amount spent (highest first), each with its name, total, share of the month's total (%), number of movements, and a simple proportional bar (CSS, no chart library).
  - "si un gasto no tiene categoría estará bajo el tag Sin categoría": movements with no category (null, including a deleted category) are grouped under "Sin categoría".
  - "si la transferencia, pago, etc tiene categoría se agrupará con ella": a categorized movement of any spending type goes into its category's group.
  - "cuándo": each group can be opened to list its movements, newest first, with date, counterparty, type label and amount, each linking to the existing movement detail `/movimientos/[id]`.
  - Empty month: a clear empty state, not an empty chart.
  - Every query is scoped by the signed-in user (`account.userId`), like `features/movements/queries.ts`.

- S2. "En la pantalla de Finanzas personales se podrán definir cuánto quiero gastar y en qué y cómo vengo este mes: Cuánto tengo "disponible" para gastar en esa categoría o si me pasé"
  - Assumption: a budget is a monthly spending limit for one of the user's categories in one currency. It is recurring: once set, it applies to every month until changed or removed (no per-month copies). Money in integer cents (`BigInt`), like the rest of the schema. New model + additive migration; at most one budget per (user, category, currency).
  - Assumption: "Sin categoría" cannot have a budget (it is not a category).
  - "definir cuánto quiero gastar y en qué": from the Finanzas screen the user can set, change and remove the budget of a category for the selected currency (Server Actions scoped by the signed-in user; a user can never read or change another user's budget or use another user's category). Validation with Spanish errors, reusing `parseAmountToCents`.
  - "cómo vengo este mes": each category group with a budget shows spent vs budget for the selected month and a bar against the budget.
  - "Cuánto tengo "disponible" para gastar en esa categoría o si me pasé": shows "Disponible $X" when spent ≤ budget, and "Te pasaste por $Y" (over-budget styling) when spent > budget.
  - Categories with a budget but no spending this month still appear (spent $0, all available). A month summary shows the total budgeted vs total spent for budgeted categories.

## Tasks

- [x] T1 (S1) aggregation (pure grouping + month range helpers + scoped query), `/finanzas` page with loading state, Home quick action, tests, docs (docs/FUNCIONALIDADES.md). Route: delegated (long-session context backstop on the parent). Risk: none expected (read-only feature, additive). Done (uncommitted): RED month/summary/queries/quick-action/proxy tests failed (missing modules, QUICK_ACTIONS undefined, "/finanzas" not in matcher); L4 RED flow/summarizeMonth/listMonthMovements failed; GREEN 1051/1051.
- [x] T2 (S2) Budget model + additive migration, scoped budget actions (set/update/remove) with validation, budget vs spent display on `/finanzas`, tests, docs. Route: delegated together with T1 (same screen, same writer). Risk: item 2 (writes must be scoped to the signed-in user's own categories) → independent verifier after. Done (uncommitted): migration `20261111220807_budgets` (additive); RED actions tests failed (missing module); GREEN. Independent verifier still pending.

## Log

- L1 (2026-11-11, user request): see S1.
- L2 (2026-11-11, parent): while mapping, found `text-yellow` is also used for SENT/TOP_UP amounts; darkened the light ochre token in `app/globals.css` from `#a87a12` to `#7f5c0e` (≥5:1 on surface, canvas and yellow-soft). Not part of T1.
- L3 (2026-11-11, user addition): see S2.
- L4 (2026-11-11, user correction): "Qué cuenta como gasto: Todo lo que pueda descontar dinero. Lo que se ingresa cuenta como Ingreso y compra/venta de dólares es Conversión o quizá existe la opción de ponerle la etiqueta de Ahorro. Lo del periodo está bien. La agrupación la veo bien. El presupuesto es tal cual eso"
- L5 (2026-11-11, writer): T1+T2 implemented in `features/finances/**`, `app/(app)/finanzas/**`, Home quick action "Finanzas" (`ChartIcon`), `/finanzas/:path*` in `proxy.ts`, seed budgets for Lucía (Comida $300.000, Servicios $80.000, ARS), docs. Classification in `features/finances/flow.ts` (`moneyFlow`: RECEIVED→income, EXCHANGE→conversion, default→expense). New table `presupuestos` (unique user+category+currency, FK cascades, CHECK amount > 0). Budget writes check `isOwnCategory` in a transaction; removal scoped by `userId`. Writer assumptions: conversion groups show movement count, not a money total (an EXCHANGE row has no direction without its exchange); the "Diferencia" is ingresos minus gastos; the AccountSwitcher drops `?mes=` when switching (reused unchanged, so it returns to the current month). Checks: `pnpm test` 77 files / 1051 tests passed; `tsc --noEmit` exit 0; `pnpm lint` exit 0; manual render of `/finanzas` on the dev server with a temporary user (deleted after) showed the summary, groups, budget statuses, Conversión section, empty state and month fallback; anonymous → 307 `/ingresar`.
- L6 (2026-11-11, parent spot check): `features/finances/queries.test.ts` "lists only the user's movements…" was flaky (2 of 3 runs failed): the RECEIVED and EXCHANGE fixtures shared `2026-11-05T12:00:00Z`, so the `id asc` tiebreak on random UUIDs decided their order. Fixed the fixture only (EXCHANGE at 13:00Z); 5/5 passes. Independent verifier for T2 running.
- L7 (2026-11-11, independent verifier T2): PASS, no blockers. Writes take userId only from the session; foreign category/budget ids, anonymous and crafted values refused with nothing persisted; ownership check and write share one transaction; BA month boundaries correct; migration matches schema. Full suite 77 files / 1051 tests on a scratch DB, tsc and lint clean. Advisory: a conversion tagged with a budgeted category (e.g. "Ahorro") does not count against that budget (per L4).
