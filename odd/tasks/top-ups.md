# Recargas: SUBE

Objective: the Recargas screen gets a working "Tarjeta de transporte" option for SUBE cards: register many cards with a nickname and top them up from a peso card.
Branch: `feat/accounts` (after the accounts feature's T13). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "añadiremos la pantalla de Tarjeta de transporte, la cual será SUBE y se validará el formato, el cual serán 4 bloques de 4 números que empiezan con 6061". A SUBE number is 16 digits starting with 6061, typed or shown as `6061 1234 5678 9012`; spaces are optional when typing.
- S2. "podrás dar de alta muchas tarjetas SUBE y ponerle un nombre de recordatorio \"sube de mauri\" por ejemplo". A user registers many SUBE cards, each with a nickname; the same number cannot be registered twice by the same user.
- S3. "se debe aclarar que luego de recargar que se tiene que convalidar el pago en una terminal o con la aplicación de SUBE". The confirmation and success screens say the top-up must be validated at a SUBE terminal or with the SUBE app.
- S4. Assumptions: a top-up debits a peso account through one of its cards (the same card picker as the dollar screen), is atomic with an idempotency key like transfers, creates a movement of a new type "Recarga" with the SUBE nickname and the masked number, and has a sensible range (for example $100 to $50.000 per top-up). Telefonía and Televisión satelital stay "Próximamente". The note and category of odd/tasks/categories.md will apply to top-ups when that feature lands.

## Tasks

- [ ] T1 (S1, S2) SUBE card model, migration, validation, list and add screens with nickname.
- [ ] T2 (S3, S4) top-up service and flow (amount, card, confirmation with the validation notice, success).

Route evidence: starts after accounts T13 (BigInt money), because it adds a movement type and money columns.

## Log

- L1 (2026-11-03, user request): "Vamos a trabajar en la pantalla de recargas: añadiremos la pantalla de Tarjeta de transporte, la cual será SUBE y se validará el formato, el cual serán 4 bloques de 4 números que empiezan con 6061, podrás dar de alta muchas tarjetas SUBE y ponerle un nombre de recordatorio \"sube de mauri\"por ejemplo, se debe aclarar que luego de recargar que se tiene que convalidar el pago en una terminal o con la aplicación de SUBE"
- L2 (2026-11-03, user): "En Recargas, quitar el cartel de Proximamente". The notice is gone; each option keeps its small badge until it exists (Tarjeta de transporte turns into SUBE in T1/T2).
