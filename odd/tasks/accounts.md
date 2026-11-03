# Accounts, currencies, cards and profile

Objective: one account per currency (ARS by default, USD optional) with its own alias and cards, dollar buy/sell at a simulated rate, and a Perfil screen.
Branch: `feat/accounts` (from `feat/transfers` at 72b0f05). Delivery strategy: `single-pr` (the user chose one PR for the previous feature). Test runner: Vitest. Absorbs `odd/tasks/cards.md`.

## Specs

- S1. "cada usuario debe tener un alias asociado a su cuenta, debe ser modificable en una nueva pantalla Perfil donde se podrán modificar el nombre, apellido, direccion, teléfono, mail y alias, además de tener una foto de perfil por defecto, también cosas como Moneda preferida".
- S2. "por defecto en toda la aplicación debe ser ARS en vez de USD y además agregar el '$' adelante, ejemplo $5000 para ARS 5000 y USD$5000 para 5000 dólares". Assumption: Argentine separators, so `$5.000` and `USD$5.000`, decimals with a comma.
- S3. "Por defecto será en ARS, salvo que se indique lo contrario, luego, el usuario tiene algun alias en dólares o tarjetas en USD que slo podrán hacer transferencias y operaciones en dólares". Model chosen by the user (option 1): the balance belongs to the account; each user has one ARS account and may have one USD account; each account has its own alias and its cards. A transfer only goes between accounts of the same currency.
- S4. "se indicará en una pantalla para comprar dólares (o vender) con una cotización simulada de ARS 1500 , si compro dólares se descuenta de la tarjeta que se indique el saldo en ARS y si vendo dólares se decuentan esos USD y se sumarán esos ARS al saldo de una tarjeta a la cotización que simulamos". Assumption: under the account model, the user picks the card, and the money moves between the accounts of the selected cards; one rate (1 USD = ARS 1.500) for both directions.
- S5. From cards.md: "deben poder añadirse más tarjetas, a la hora de crear el formulario para dar de alta una tarjeta, debe validarse si es Visa, Master o American Express, no es necesario conectarse a una API o algo por el estilo pero algo básico para mostrar como pensamos el producto". Local validation: prefix, length, Luhn, expiry not in the past, CVV length per brand. Only brand, last 4 digits, holder and expiry are stored; the full number and CVV never are.
- S6. Assumptions for Perfil: changing the email (the login identifier) requires the current password; address and phone are optional; the default photo is an avatar with initials; "Moneda preferida" picks the account shown first on Home and used by email transfers. Perfil is a bottom-navigation destination.
- S7. Assumption: a USD account is opened from the dollar screen ("Abrir cuenta en dólares"); the seed gives the main user both accounts.
- S8. Existing stored money is never relabeled: the migration keeps each account's stored currency; only the default changes to ARS.

## Tasks

- [x] T1 (S1, S3, S5, S8) delegated: schema migration (Currency enum, accounts per user and currency, Card model from the account card columns, contacts point at accounts, first and last name, profile fields, EXCHANGE movement type), seed, existing queries and tests adapted.
- [ ] T2 (S2) parallel: ARS/USD money formatting and every screen using the account currency.
- [ ] T3 (S3, S6) parallel: Home account switcher by preferred currency; transfers restricted to the same currency.
- [ ] T4 (S4, S7) parallel: atomic dollar buy/sell service and screen, USD account opening.
- [ ] T5 (S5) parallel: cards list and add-card form with brand validation.
- [ ] T6 (S1, S6) parallel: Perfil screen and bottom navigation item.
- [ ] T7 inline: README, seam check, browser checks.

Route evidence: the parent context is past the long-session backstop, so units are delegated (context reason). T2–T6 depend on T1 and start after it, with disjoint edit surfaces. Risk: T1 item 1 (migration moves stored data) and T3/T4 item 4 (balance updates under locks): independent verifier after T1 and at the end.

## Log

- L1 (2026-11-03, user request): "Bien, ahora, cada usuario debe tener un alias asociado a su cuenta, debe ser modificable en una nueva pantalla Perfil donde se podrán modificar el nombre, apellido, direccion, teléfono, mail y alias, además de tener una foto de perfil por defecto, también cosas como Moneda preferida (por defecto en toda la aplicación debe ser ARS en vez de USD y además agregar el '$' adelante, ejemplo $5000 para ARS 5000 y USD$5000 para 5000 dólares)"
- L2 (2026-11-03, user): "Por defecto será en ARS, salvo que se indique lo contrario, luego, el usuario tiene algun alias en dólares o tarjetas en USD que slo podrán hacer transferencias y operaciones en dólares, de paso, se indicará en una pantalla para comprar dólares (o vender) con una cotización simulada de ARS 1500 , si compro dólares se descuenta de la tarjeta que se indique el saldo en ARS y si vendo dólares se decuentan esos USD y se sumarán esos ARS al saldo de una tarjeta a la cotización que simulamos"
- L3 (2026-11-03, user): chose "1": the balance belongs to the account, and cards belong to an account.
- L4 (2026-11-03): T1 by a delegated writer: RED 12 of 17 transfer tests, then GREEN; 178 tests, tsc, eslint and a scratch production build pass. Migration upgrade check in a throwaway database kept accounts, movements, transfers and users identical by md5, created 3 cards, split names, remapped contacts (a contact of a user without account is dropped) and left no drift. The dev database is migrated. Writer decisions: upgraded users keep `preferredCurrency` equal to their existing account currency; transfer route segment renamed to `to/[accountId]`; CURRENCY_MISMATCH reads "No tenés una cuenta en esa moneda.". Parent check: diff inside the allowed surfaces, 178 tests rerun.
- L5 (2026-11-03, user): "el formato en toda la aplicación será el argentino, por más que sean dólares". Amount input now parses the Argentine format only: dots group thousands, a comma starts the decimals; "12.5" is rejected. Formatting shows `$5.000`, `USD$12,50` (61f9e20).
