# Ingresar dinero

Objective: a Home card to add money to the user's accounts from a test account, so the demo can always fund operations.
Branch: `feat/accounts` (after Servicios layer 1). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "Habrá una card en el inicio para Ingresar dinero, aparecerá una cuenta de prueba para hacer estos movimientos de dinero".
- S2. Assumptions: a seeded system user "Cuenta de prueba" owns one ARS and one USD account with a very large balance; it cannot sign in and is never listed as a transfer recipient or contact. "Ingresar dinero" is a Home quick action that opens `/ingresar-dinero`: the user picks the destination account (ARS or USD), types an amount (Argentine format, up to $1.000.000 or USD 10.000 per deposit), confirms, and gets a receipt. Under the hood it reuses the transfer service from the test account of that currency to the user's account (same locks, idempotency key in the URL), so the user's movement is "Pago recibido" from "Cuenta de prueba". The screen shows the test account's details (name, alias, currency) so the source is explicit.

## Tasks

- [x] T1 (S1, S2) test account in the seed, deposit flow and Home card. Route: inline. Risk: items 1 (migration adds `usuarios.es_cuenta_prueba`) and 2 (the test account can never sign in, be found as a recipient or receive a transfer; new guarded routes under `/ingresar-dinero`). Commits 9718169 (test account and guards) and fc42ffc (deposit flow).

Assumptions (S2): the test user is marked by `isTestAccount`; login refuses it whatever the password; alias and email lookups, the amount step and `transfer` treat its accounts as not found; the deposit service calls `transfer` with the test account as sender and returns the user's received movement; the user's account must exist in the chosen currency (no account is created). The test account exists only after `pnpm db:seed`.
- [ ] T2 (S3) scheduled deposits screen (demo only). Not started; queued after Promociones.

## Log

- L1 (2026-11-03, user request): "Habrá una card en el inicio para Ingresar dinero, aparecerá una cuenta de prueba para hacer estos movimientos de dinero"
- L2 (2026-11-03, user): "Sigue con otra cosa" (picked Ingresar dinero: the smallest planned feature and the latest planned).
- L3 (2026-11-03): T1 done; RED observed for the deposit service, the guards and the actions. vitest 838/838, tsc and eslint clean. The shared amount parser already caps at $1.000.000, so an ARS amount above it gets the generic amount message, as in Transferir; the cap message shows for USD. The test account exists in the dev database: the deposit tests create it when the seed has not run, and never delete it. 9718169 alone does not run the seed (it imports features/deposits/test-account.ts from fc42ffc). Not checked in a browser. Independent verifier: S1, S2 pass, no blockers; differential check of login, lookups and transfer for regular users identical to 654a6fa. Advisories, not fixed: changing the currency in a confirmation URL makes a second deposit with the same key (keys are scoped per sending account; only into the user's own account, within the cap); the ARS cap message never shows (shared parser); sessions do not check the flag (no session can be created for it); a drained test account shows the generic amount message; login answers faster for the test account's '!' hash.
- L4 (2026-11-03, user): "Ingresar dinero debería ser la primer card de todas". Moved to the first quick action on Home.
- L5 (2026-11-03, user): "El texto de la acción rápida de ingresar dinero no está centrado como el resto, podría decir solo Ingresar". The label is now "Ingresar", one word like the others. Native review of 654a6fa..38b5f0b approved and acknowledged; non-blocking advisories R1-idempotency-key-currency-scope, R1-shared-test-account-drain, R3-ars-cap-message-unreachable, R3-cross-currency-key-reuse, R3-pages-untested, R3-seed-rerun-with-deposits, R3-test-account-create-race.
- L6 (2026-11-03, user request): "En ingresar dinero añade la opción de programar ingresos (no hace falta que funcione de verdad) , esto es para que X día del mes o X día de la semana se te ingrese dinero automáticamente a la cuenta"
