# E2E tests

Objective: add a local-only Playwright end-to-end suite that covers the app's key browser flows, starting with the bug class unit tests missed.
Branch: `chore/rebrand-vuelto` (work-unit commits; not pushed). Delivery strategy: `ask-on-risk`. Test runners: Vitest (unit/DB) and Playwright (e2e, new).

## Specs

- S1. "ME gustaría empezar a integrar tests e2e, te importaría hacerlo?"
- S2. "Arranquemos con corridas locales y luego integramos al CI, recuerdamelo cuando vaya a hacer un nuevo deploy"
  - Local runs only: do not touch `.github/workflows/ci.yml` (CI integration is a later task; the parent keeps the reminder).
  - Assumption (parent proposal, not objected): Playwright (`@playwright/test`, exact pinned devDependency, a version at least two weeks old), Chromium only for now.
  - Assumption: the suite runs against its own database `vuelto_e2e` on the existing docker Postgres (localhost:5433, user/password `vuelto`), created if missing, migrated and seeded by a Playwright global setup before the tests. It never touches the dev database `vuelto` or the user's `.env` passwords. Seed passwords for the e2e DB are throwaway test values defined in the e2e config/env only for that database.
  - Assumption: the app under test is started by Playwright's `webServer` on its own port (not 3000, where the user's dev server may run), with `DATABASE_URL` pointing at `vuelto_e2e`.
  - Assumption: a `pnpm test:e2e` script; Vitest keeps ignoring the e2e files (`e2e/**/*.spec.ts`); README gets a short "Tests e2e" section with prerequisites (docker DB up, `pnpm exec playwright install chromium`) and the command.
  - First flows (parent proposal): (1) user login lands on Inicio and admin login lands on Administración → Promociones; (2) changing a movement's category keeps the saved category selected after saving and after a reload (this must FAIL on commit `f563857`, before fix `e436212`, and pass now); (3) a transfer from Lucía to Martín appears on Martín's side; (4) a regular user cannot open `/admin/promociones` (sees "Página no encontrada") and an anonymous visitor is sent to `/ingresar`; (5) Finanzas shows the seeded budgets and clicking a segment of the spending bar opens that category's group.
  - Tests use accessible locators (roles, labels, visible text), no sleeps, each test independent (seeded state or data it creates itself).

## Tasks

- [x] T1 (S1, S2) Playwright setup (dependency, config, global setup with isolated DB, script, vitest exclusion, README) + the five flows, with flow (2) proven RED on `f563857`. Route: delegated (long-session context backstop on the parent). Risk: item 5 (new dev dependency and browser download). Evidence: `pnpm test:e2e` 7/7 passed three times; flow (2) RED on `f563857`; Vitest 1076/1076, tsc and lint clean. Uncommitted.

## Log

- L1 (2026-11-12, user request): see S1.
- L2 (2026-11-12, parent): proposed Playwright, an isolated e2e DB and five first flows; asked whether to include CI from the start.
- L3 (2026-11-12, user answer): see S2. Reminder saved in memory (`e2e-ci-reminder`).
- L4 (2026-11-12, writer T1): `@playwright/test` 1.64.1 pinned (1.65.0 was under two weeks old), Chromium only. `playwright.config.ts` runs `tsx e2e/setup-db.ts && next build && next start --port 3100` as the `webServer` with `DATABASE_URL` on `vuelto_e2e`, `reuseExistingServer: false`, one worker. The DB setup (create with `pg` if missing, `prisma migrate deploy`, `prisma db seed` with test-only passwords from `e2e/env.ts`) is the first step of that command instead of `globalSetup`, because `next build` already needs the migrated database and the command guarantees the order. Production build chosen over `next dev`: closer to a deploy with Cache Components and no clash with a `next dev` in the same checkout. Specs: `login`, `access`, `movement-category`, `transfer`, `finances` (7 tests). RED on `f563857` (worktree with its own `pnpm install --offline`; a symlinked `node_modules` makes Turbopack fail with "Could not find the Next.js package"): `movement-category.spec.ts:22` expected `option:checked` "Comida", received "Sin categoría". GREEN on the current tree. Vitest excludes `e2e/**`. Next: CI integration (S2, later; reminder kept by the parent).
