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

- [ ] T1 (S2) model and migration: service companies, adhesions, simulated bills, movement type; company number validation.
- [ ] T2 (S2) screens: Servicios list, adhere, bills of an adhesion, pay flow with confirmation and receipt.
- [ ] T3 (S3) dollar companies and the Servicios category.
- [ ] T4 (S4) scheduled and automatic payments.

Route evidence: starts after accounts T13 (BigInt money), because it adds money columns and a movement type.

## Log

- L1 (2026-11-03, user request): "hay que trabajar en la sección de Servicios, propón ideas para que podamos llegar a una buena sección. Se me ocurre que se pueda programar pagos, que se pida un número de pago electrónico, servicios como AySA, Edesur, Edenor, Metrogas y servicios en dólares, quizá que se puedan agregar categorías para hacer los resúmenes más adelante como habíamos hablado"
- L2 (2026-11-03, user): "Me parece bien, empieza por donde decís" (layer 1 first).
