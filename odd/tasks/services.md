# Servicios

Objective: adhere utility services with their electronic payment number, pay simulated bills from a card of the right currency, and later schedule payments.
Branch: `feat/accounts` (after the accounts feature's T13). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. User idea: "Se me ocurre que se pueda programar pagos, que se pida un número de pago electrónico, servicios como AySA, Edesur, Edenor, Metrogas y servicios en dólares, quizá que se puedan agregar categorías para hacer los resúmenes más adelante como habíamos hablado". The user approved a three-layer plan: "Me parece bien, empieza por donde decís".
- S2. Layer 1 (now): adhere a service by company (AySA, Edesur, Edenor, Metrogas) with its electronic payment number (length validated per company) and a nickname; each adhesion gets simulated pending bills with amount and due date derived from the number; paying a bill picks a card of the bill's currency, is atomic with an idempotency key, and creates a "Pago de servicio" movement with a receipt. A bill cannot be paid twice.
- S3. Layer 2 (later): companies billing in dollars (two examples, e.g. a health plan and an insurance) payable only from USD cards; payments go to the "Servicios" category of odd/tasks/categories.md, editable.
- S4. Layer 3 (later): automatic debit on the due date and one-off scheduled payments, processed by a route handler meant for a cron plus a "Procesar pagos agendados" button for the demo; a payment without balance ends as failed with a notice and never overdraws; Home shows "Vence en N días" for unscheduled bills.
- S5. Out of scope: barcode scanning and real payment networks.

## Tasks

- [x] T1 (S2) model and migration: service companies, adhesions, simulated bills, movement type; company number validation. Route: inline. Commit 019354e.
- [x] T2 (S2) screens: Servicios list, adhere, bills of an adhesion, pay flow with confirmation and receipt. Route: inline. Commit db6d1eb.
- [ ] T3 (S3) dollar companies and the Servicios category.
- [x] T4 (S4) scheduled and automatic payments, in three units:
  - [x] T4a model, migration and `processScheduledPayments` (pays due one-off schedules and auto-debit bills through `payBill` with key `scheduled-<billId>`; no balance or no card ends as failed, never retried until the user schedules again). Route: inline. Risk: items 1 and 4. Commit 596f9b4.
  - [x] T4b route handler `/api/pagos-agendados` for the cron, `Authorization: Bearer $CRON_SECRET`, refuses when the secret is unset. Route: inline. Risk: item 2. Commit 91913d0.
  - [x] T4c screens: schedule and cancel on the bill, auto-debit card on the adhesion, "Procesar pagos agendados" button (only the user's bills), failure notices, Home "Vence en N días" for bills with no schedule and no auto-debit. Route: inline. Commit b3df216.

Assumptions (S4): a schedule date runs from today to the due date (today when overdue); the auto-debit pays a bill on or after its due date; a one-off schedule wins over the auto-debit; scheduling again or changing the auto-debit clears a failure.

Route evidence: starts after accounts T13 (BigInt money), because it adds money columns and a movement type.

## Log

- L1 (2026-11-03, user request): "hay que trabajar en la sección de Servicios, propón ideas para que podamos llegar a una buena sección. Se me ocurre que se pueda programar pagos, que se pida un número de pago electrónico, servicios como AySA, Edesur, Edenor, Metrogas y servicios en dólares, quizá que se puedan agregar categorías para hacer los resúmenes más adelante como habíamos hablado"
- L2 (2026-11-03, user): "Me parece bien, empieza por donde decís" (layer 1 first).
- L3 (2026-11-03): resumed after the machine ran out of memory (RAM-backed /tmp held 4.5 GB of old scratch and the pnpm store; cleared on the user's request). Postgres was down and the services migration unapplied; after `docker compose up` and `prisma migrate deploy`: vitest 728/728, tsc and eslint clean. T1 and T2 committed. Risk: items 1 (additive migration) and 2 (proxy guard now covers /servicios/:path*). Verifier: S2 pass, S5 respected, no blockers (advisories: adherir page skips getCurrentUser; key replay after card deletion returns IDEMPOTENCY_MISMATCH; cross-account same-key race returns the generic error, still charged once). Native review (risk, reliability): approved and acknowledged; non-blocking advisories R3-misleading-fixture-comment, R3-movement-direction-unproved, R3-overdraw-assertion-weak. Next: T3.
- L4 (2026-11-03, user): "si, continua" (layer 3 before layer 2; layer 2 waits for odd/tasks/categories.md).
- L5 (2026-11-03): T4 done. RED observed for the processor, the cron route and the actions before each implementation. vitest 773/773, tsc and eslint clean. `.env.example` could not be edited (blocked by the user's permission settings), so `CRON_SECRET` is documented in the README only. Not checked in a browser: the running dev server keeps the old Prisma client until restarted. Independent verifier: S2, S4, S5 pass, no blockers. Fixed two advisories (a failure is only marked while the bill keeps the schedule or auto-debit the run tried; the cron route reads the request before the secret so it never prerenders), RED observed first; vitest 774/774. Remaining advisories: an auto-debit change racing a payment's commit pays with the previous card (serializable as payment then change); an overlapping run counts an idempotent replay as paid; cancelScheduledPayment has no try/catch; a whitespace-only CRON_SECRET counts as set. Native review (risk, resilience, reliability) of f0be97e..84f1b0a: approved and acknowledged; non-blocking advisories R3-cancel-no-error-handling, R3-global-run-cross-file-interference, R3-overlap-paid-count-unproved, R4-swallowed-bill-errors-invisible-to-cron, R4-unbounded-sequential-cron-run. Next: T3 after odd/tasks/categories.md.
