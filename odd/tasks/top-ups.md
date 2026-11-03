# Recargas: SUBE

Objective: the Recargas screen gets a working "Tarjeta de transporte" option for SUBE cards: register many cards with a nickname and top them up from a peso card.
Branch: `feat/accounts` (after the accounts feature's T13). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "añadiremos la pantalla de Tarjeta de transporte, la cual será SUBE y se validará el formato, el cual serán 4 bloques de 4 números que empiezan con 6061". A SUBE number is 16 digits starting with 6061, typed or shown as `6061 1234 5678 9012`; spaces are optional when typing.
- S2. "podrás dar de alta muchas tarjetas SUBE y ponerle un nombre de recordatorio \"sube de mauri\" por ejemplo". A user registers many SUBE cards, each with a nickname; the same number cannot be registered twice by the same user.
- S3. "se debe aclarar que luego de recargar que se tiene que convalidar el pago en una terminal o con la aplicación de SUBE". The confirmation and success screens say the top-up must be validated at a SUBE terminal or with the SUBE app.
- S4. Assumptions: a top-up debits a peso account through one of its cards (the same card picker as the dollar screen), is atomic with an idempotency key like transfers, creates a movement of a new type "Recarga" with the SUBE nickname and the masked number, and has a sensible range (for example $100 to $50.000 per top-up). (Telefonía and Televisión satelital were later specified in S5 and S6.) The note and category of odd/tasks/categories.md will apply to top-ups when that feature lands.
- S5. "En recargas, añadir Compañías de telefono, el cual te pedirá cuánto cargar y pedirá un número de teléfono compatible con argentina (+54 11 xxxx xxxx) y las empresas que están disponibles serán Personal, Movistar, Claro y Tuenti". Assumptions: the number is stored and shown as +54 plus a 10-digit national number (area code of 2 to 4 digits, e.g. `+54 11 1234 5678`); typing accepts it with or without +54, with or without the mobile 9, with spaces or dashes; it must end up as exactly 10 digits not starting with 0. Same amount range, card picker, atomic service, idempotency and "Recarga" movement as SUBE.
- S6. "Televisión satelital aparecerá DirecTV en Recargas, preguntar cuánto dinero y un número de cuenta". Assumptions: the DirecTV account number is 8 to 12 digits (spaces or dashes allowed when typing), masked on receipts as `···· 4321`; same amount range, card picker, atomic service and "Recarga" movement.

## Tasks

- [x] T1 (S1, S2) SUBE card model, migration, validation, list and add screens with nickname.
- [x] T2 (S3, S4) top-up service and flow (amount, card, confirmation with the validation notice, success).
- [x] T3 (S5) phone top-up: company, Argentine number validation, same service.
- [x] T4 (S6) DirecTV top-up: account number and amount, same service.

Route evidence: starts after accounts T13 (BigInt money), because it adds a movement type and money columns.

## Log

- L1 (2026-11-03, user request): "Vamos a trabajar en la pantalla de recargas: añadiremos la pantalla de Tarjeta de transporte, la cual será SUBE y se validará el formato, el cual serán 4 bloques de 4 números que empiezan con 6061, podrás dar de alta muchas tarjetas SUBE y ponerle un nombre de recordatorio \"sube de mauri\"por ejemplo, se debe aclarar que luego de recargar que se tiene que convalidar el pago en una terminal o con la aplicación de SUBE"
- L2 (2026-11-03, user): "En Recargas, quitar el cartel de Proximamente". The notice is gone; each option keeps its small badge until it exists (Tarjeta de transporte turns into SUBE in T1/T2).
- L3 (2026-11-03, user): "En recargas, añadir Compañías de telefono, el cual te pedirá cuánto cargar y pedirá un número de teléfono compatible con argentina (+54 11 xxxx xxxx) y las empresas que están disponibles serán Personal, Movistar, Claro y Tuenti"
- L4 (2026-11-03, user): "Televisión satelital aparecerá DirecTV en Recargas, preguntar cuánto dinero y un número de cuenta"
- L5 (2026-11-03): All four tasks by one delegated writer (one shared service). 644 tests (134 new), tsc, eslint, scratch build; migration on a throwaway DB kept 8 tables identical and both CHECKs reject bad rows; dev DB migrated. Not yet checked in a browser or `next dev`: covered by the independent verifier next.
- L-phone (2026-11-03, user): "En recarga de celular lista las compañías en lugar de que formen parte del formulario". /recargas/celular lists Personal, Movistar, Claro and Tuenti; each opens /recargas/celular/<compania> with the number, amount and card form.
- L-scheduled (2026-11-03, user request): "En recargas añade la opción de programar recargas, por ejemplo, cargar cada 1 mes 10 000 la tarjeta de transporte, notificar cuando se hace un movimiento así". Queued after Promociones and the scheduled deposits; the notice goes with odd/tasks/notifications.md.
- L-demo (2026-11-03, user, about scheduled top-ups and subscriptions): "Que queden como demo". Scheduled top-ups: saved SUBE cards only (the user's example), every week or every month on a day, amount $100 to $50.000; saved and listed on the SUBE card screen, deleted there; nothing charges them. The notice of a run goes with odd/tasks/notifications.md if it ever runs.
