# Ingresar dinero

Objective: a Home card to add money to the user's accounts from a test account, so the demo can always fund operations.
Branch: `feat/accounts` (after Servicios layer 1). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "Habrá una card en el inicio para Ingresar dinero, aparecerá una cuenta de prueba para hacer estos movimientos de dinero".
- S2. Assumptions: a seeded system user "Cuenta de prueba" owns one ARS and one USD account with a very large balance; it cannot sign in and is never listed as a transfer recipient or contact. "Ingresar dinero" is a Home quick action that opens `/ingresar-dinero`: the user picks the destination account (ARS or USD), types an amount (Argentine format, up to $1.000.000 or USD 10.000 per deposit), confirms, and gets a receipt. Under the hood it reuses the transfer service from the test account of that currency to the user's account (same locks, idempotency key in the URL), so the user's movement is "Pago recibido" from "Cuenta de prueba". The screen shows the test account's details (name, alias, currency) so the source is explicit.

## Tasks

- [ ] T1 (S1, S2) test account in the seed, deposit flow and Home card.

## Log

- L1 (2026-11-03, user request): "Habrá una card en el inicio para Ingresar dinero, aparecerá una cuenta de prueba para hacer estos movimientos de dinero"
