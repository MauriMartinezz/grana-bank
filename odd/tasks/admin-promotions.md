# Admin promotions

Objective: an admin user signs in to an admin view and creates promotions (bank, card issuer, name, days, percent, cap, minimum, description).
Branch: `chore/rebrand-vuelto` (shared with the uncommitted rebrand; no commits until the user decides). Delivery strategy: `ask-on-risk`. Test runner: Vitest (`pnpm test`, DB tests need the docker Postgres on 5433).

## Specs

- S1. "Quiero que crees un agente con la vista de administrador, quizá un usuario admin@admin.com y con contraseña Admin123! o algo sencillo para poder loguearse, desde ahí se podrán dar de alta promociones según: Banco, Emisora (amex, visa o mastercard), etc, dar nombre, días, cantidad y descripción a las promociones por ejemplo"
  - Assumption (parent decision, told to the user): the admin is `admin@vuelto.test`; the seed creates it only when `ADMIN_PASSWORD` is set and hashes that password like `SEED_USER_PASSWORD`; no password is ever written in the repository. Locally the user sets `ADMIN_PASSWORD='Admin123!'`.
  - Assumption: users get a role (regular user or admin). Only an admin can open the admin view or run its actions; the check happens on the server, in every admin page and every admin Server Action, not only in the UI or the proxy. A regular user reaching an admin URL gets not found or a redirect, never the form.
  - Assumption: "Emisora" maps to the existing `CardBrand` (VISA, MASTERCARD, AMEX), with an option for every card (null). "Nombre" maps to the existing `merchant`; "descripción" maps to the existing `conditions`. "Banco" is a new optional text field. "Días" maps to `weekdays` (at least one). Category and validity dates stay as they are today.
- S2. "Sí, cantidad puede ser al % de descuento pero también tiene que haber un campo de límite de descuento (ejemplo: 10% hasta $10 000, con la opción de que sea sin límite y sin mínimo o con mínimo)"
  - "cantidad" is the existing `percent` (1 to 100).
  - The discount cap becomes optional: a value means "10% hasta $10.000", none means "sin límite".
  - New optional minimum purchase: none means "sin mínimo", a value means a minimum purchase amount.
  - Money stays in integer cents (`BigInt`), as in the rest of the schema.
  - Every place that shows a promotion (list card, detail, "today" widget) shows the cap or "sin límite", the minimum when there is one, and the bank when there is one.

## Tasks

- [x] T1 (S1, S2) schema + migration (role, optional cap, minimum, bank), seed admin from `ADMIN_PASSWORD`, admin guard, admin view with the create form and its Server Action, promotion display updates, tests, docs (README env vars, docs/FUNCIONALIDADES.md, docs/DEMO.md). Route: delegated (the user asked for an agent). Risk: items 1 (migration, persisted format) and 2 (auth/permissions) → independent verifier after. Evidence: RED (missing modules `features/admin/actions`, `./seed-admin`, `./validation`; `discountText(10, null)` threw "Cannot convert null to a BigInt"; `minimumText` missing; nullable cap rejected by Prisma; proxy matcher lacked `/admin/:path*`) → GREEN (full suite 71 files / 995 tests, tsc, lint, `next build`). Uncommitted.

## Log

- L1 (2026-11-11, user request): see S1.
- L2 (2026-11-11, user answer): see S2.
- L3 (2026-11-11, parent): `prisma/promotions.ts` `loadPromotions` deletes every promotion before loading the catalog, so `pnpm db:seed` / `pnpm db:promos` also wipe admin-created promotions. Kept as is (the seed is a demo reset); documented.
- L4 (2026-11-11, writer T1): migration `20261111215212_admin_promotions` (additive: enum `rol_usuario`, `usuarios.rol` NOT NULL DEFAULT 'USER', `promociones.banco` and `compra_minima_centavos` nullable, `tope_centavos` DROP NOT NULL). Guard `features/admin/guard.ts` `requireAdmin()` (anonymous → /ingresar, non-admin → notFound) called by `app/admin/promociones/page.tsx` and `createPromotion`; proxy gates `/admin/:path*` by cookie only. Login and `redirectIfSignedIn` send an admin to `/admin/promociones` (`features/auth/landing.ts`). Seed: `seedAdmin` creates `admin@vuelto.test` only with `ADMIN_PASSWORD`, idempotent (seed ran 3 times, 1 admin). Display: "X% sin límite", "Compra mínima $Z", bank on card and detail; no cap sorts first among equal percents. Live smoke on `next start`: anonymous 307 → /ingresar, regular user gets "Página no encontrada", admin sees the form. `.env.example` could not be edited (permission denied): ADMIN_PASSWORD missing there; README says "no está: se pasa en el comando".
- L5 (2026-11-11, independent verifier): PASS, no blockers. S1 and S2 pass; guard runs before any parsing or write, role comes from the DB session, landing redirect uses fixed paths only; migration applied on scratch DBs, `migrate diff` reports no difference, existing rows keep their values (`rol=USER`, cap kept). Full suite 71 files / 995 tests, tsc and lint clean on a scratch DB. Advisories: `.env.example` lacks `ADMIN_PASSWORD` (permission denied, user to add); the admin has no bank account, so opening `/inicio` as admin is untested; no test for a regular user's GET of `/admin/promociones` (covered by the shared guard and the live smoke).
