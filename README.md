# GranaBank

Mobile-first home banking web app built for a technical challenge. A user signs in and manages one account per currency (pesos, and optionally dollars): transfers, dollar exchange, cards, top-ups, service payments with scheduling, categories, deposits from a test account and promotions. Everything runs locally against a PostgreSQL database in Docker; no real bank, card network or company is contacted.

## Contents

- [Features](#features)
- [Stack](#stack)
- [Requirements](#requirements)
- [Run it locally](#run-it-locally)
- [Everyday commands](#everyday-commands)
- [Troubleshooting](#troubleshooting)
- [Try it](#try-it)
- [Project structure](#project-structure)
- [Decisions](#decisions)

## Features

| Area | What the user can do |
|------|----------------------|
| Sign in | Email and password, "Recordarme", logout from Perfil |
| Home | Balance per account, quick actions, upcoming bills, today's promotions, latest movements |
| Movimientos | Search and filter by date, open the detail, change a movement's category |
| Transferir | Send by alias or email, with a note and a category; contacts and favorites |
| Dólares | Buy and sell dollars at a simulated rate |
| Tarjetas | Add Visa, Mastercard or American Express cards and see each card's movements |
| Recargas | SUBE, phone (Personal, Movistar, Claro, Tuenti) and DirecTV |
| Servicios | Adhere services, pay bills in pesos or dollars, schedule a payment or turn on automatic debit |
| Ingresar dinero | Add money from a demo "Cuenta de prueba" |
| Promociones | Invented merchants' discounts filtered by weekday and category |
| Notificaciones | The bell lists money in and out, dollar operations, failed payments and service reminders |
| Perfil | Personal data, email, aliases, password, preferred currency, categories, light or dark theme |

## Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Server Actions, Cache Components, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Language | TypeScript 5 |
| Database | PostgreSQL 17 (Docker image `postgres:17-alpine`) |
| ORM | Prisma 7 with the `pg` driver adapter |
| Tests | Vitest 5, against the real database |
| Lint | ESLint 9 with `eslint-config-next` |
| Package manager | pnpm (version pinned in `package.json` → `packageManager`) |

No external services, payment gateways or authentication providers: passwords use `node:crypto` scrypt and sessions live in the database.

## Requirements

Install these before you start:

| Tool | Version | Why | Check |
|------|---------|-----|-------|
| [Node.js](https://nodejs.org) | 22 or newer | Runs Next.js, Prisma and the tests | `node -v` |
| [pnpm](https://pnpm.io) | the one in `packageManager` (Corepack picks it) | Installs dependencies and runs the scripts | `pnpm -v` |
| [Docker](https://docs.docker.com/get-docker/) with Compose v2 | Docker Desktop, or Docker Engine plus the Compose plugin | Runs PostgreSQL | `docker compose version` |
| Git | any | Clones the repository | `git --version` |

Ports **3000** (the app) and **5433** (PostgreSQL) must be free. You also need the main user's password from the challenge brief: the seed reads it from `SEED_USER_PASSWORD` and it is never stored in the repository.

Corepack ships with Node.js; if `pnpm` is missing, run `corepack enable` once.

## Run it locally

```bash
# 1. Get the code
git clone git@github.com:MauriMartinezz/grana-bank.git
cd grana-bank

# 2. Configure the environment (the defaults work with the Docker database)
cp .env.example .env

# 3. Install dependencies
pnpm install

# 4. Start PostgreSQL in Docker and wait until it is healthy (port 5433)
pnpm db:up

# 5. Create the tables and generate the Prisma client
pnpm db:migrate

# 6. Load the demo data: users, accounts, cards, services, promotions
SEED_USER_PASSWORD='<password from the brief>' pnpm db:seed

# 7. Start the app
pnpm dev
```

Open http://localhost:3000, preferably in a mobile viewport (browser dev tools → device toolbar), and sign in as `soygranate@clublanus.com` with the brief's password.

### Environment variables

| Variable | Required | Default in `.env.example` | Purpose |
|----------|----------|---------------------------|---------|
| `DATABASE_URL` | Yes | `postgresql://grana:grana@localhost:5433/grana_bank` | The Docker database from `docker-compose.yml` |
| `SEED_USER_PASSWORD` | Only for `pnpm db:seed` | none: pass it on the command line | Password of every seeded user |
| `CRON_SECRET` | No | not included: add it to `.env` | Bearer secret of `/api/pagos-agendados`; while unset, the endpoint refuses every request |

### Scheduled payments

Scheduled and automatic service payments run when something calls `/api/pagos-agendados` (`GET` or `POST`) with `Authorization: Bearer $CRON_SECRET`, for example a daily cron. Locally, set `CRON_SECRET` in `.env` (for example with `openssl rand -hex 32`), restart `pnpm dev`, and call:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/pagos-agendados
# {"paid":N,"failed":N}
```

Without a secret, the **Procesar pagos agendados** button at the bottom of Servicios runs today's payments of the signed-in user.

## Everyday commands

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Development server on http://localhost:3000 |
| `pnpm test` | Unit and integration tests; the database must be running |
| `pnpm lint` | ESLint |
| `pnpm build` | Generates the Prisma client and builds for production |
| `pnpm start` | Serves the production build |
| `pnpm db:up` | Starts PostgreSQL in Docker |
| `pnpm db:migrate` | Applies pending migrations and regenerates the Prisma client |
| `pnpm db:seed` | Resets the demo users and promotions (needs `SEED_USER_PASSWORD`) |
| `docker compose down` | Stops PostgreSQL and keeps its data |
| `docker compose down -v` | Stops PostgreSQL and deletes its data; run `db:up`, `db:migrate` and `db:seed` again |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Can't reach database server at localhost:5433` | Docker is not running or the container stopped: `pnpm db:up` |
| Port 5433 or 3000 already in use | Stop the other process, or change the left port in `docker-compose.yml` and `DATABASE_URL` |
| Errors about unknown columns or tables after pulling | Run `pnpm db:migrate` and restart `pnpm dev`: a running server keeps the Prisma client it loaded at start |
| Routes from another branch still show | Stop the server, delete `.next` and start it again |
| No promotions, or no "Cuenta de prueba" in Ingresar dinero | Run the seed (`pnpm db:seed`); it also resets the demo users |
| Tests fail with connection errors | The tests use the same database: start it with `pnpm db:up` |

## Try it

### Demo users

The seed creates the main user and two more who exist to receive transfers. They all sign in with the same password.

| Email | Aliases (ARS / USD) | Name | Starts as |
|-------|---------------------|------|-----------|
| `soygranate@clublanus.com` | `soy.granate` / `soy.granate.usd` | Soy Granate | Main user from the brief, with a peso and a dollar account |
| `juanperez@clublanus.com` | `juan.perez` / `juan.perez.usd` | Juan Perez | A contact of Soy Granate |
| `martinbozzini@clublanus.com` | `martin.bozzini` | Martin Bozzini | Pesos only, not a contact: use "Nuevo destinatario" |

It also creates the "Cuenta de prueba" (`cuenta.prueba` / `cuenta.prueba.usd`), which funds **Ingresar dinero** and cannot sign in. Running the seed again resets all of them.

### A transfer from both sides

1. Sign in as Granate and tap **Transferir**.
2. Tap **Nuevo destinatario**, enter the alias `martin.bozzini` (or tap **Transferir por email** and use the email), an amount, and confirm. Add a note and a category if you like.
3. Sign out and sign in as Martin Bozzini: the balance and a "Pago recibido" from Soy Granate, with the note, are there.

A dollar transfer works the same way to `juan.perez.usd`, from the dollar account.

### Other flows

- **Dólares:** buying debits pesos at 1 USD = $1.500 and credits dollars; selling does the reverse.
- **Recargas:** Granate starts with the SUBE card "sube de mauri" (`6061 2345 6789 0123`); Telefonía lists the companies and DirecTV takes a customer number. Each top-up debits the peso account through the chosen card. On a SUBE card, **Recarga programada** saves a weekly or monthly top-up; it is a demo, so nothing is charged.
- **Servicios:** Granate starts with the Edesur service "Luz depto" (payment number `0012345678`) and two simulated bills. Tapping a service opens the payment of its next bill. **Adherir servicio** lists AySA, Edesur, Edenor and Metrogas (pesos) and Salud Plena and Austral Seguros (two fictional companies billed in dollars). A bill can be scheduled for a day up to its due date, and a service can pay every bill by automatic debit. Home lists the bills that nothing pays by itself, with "Vence en N días".
- **Categorías:** every user starts with Alquiler, Comida, Servicios, Regalos and Otros; **Perfil → Categorías** adds, renames and deletes them, and the detail of any movement changes its category. Service payments go to Servicios.
- **Ingresar dinero:** the first quick action on Home adds up to $1.000.000 or USD 10.000 at a time, as a payment received from the Cuenta de prueba. **Programar ingresos** saves a deposit for a weekday or a day of the month; it is a demo, so nothing is deposited.
- **Notificaciones:** the bell on Home opens the last 30 days of money received and sent, top-ups, service and subscription payments, dollar buys and sells, failed scheduled payments and bill reminders, with an unread count. Each service sets its reminder (the same day, 1, 3 or 7 days before the due date); "Luz depto" starts with 3 days.
- **Promociones:** Home shows "Promos de hoy"; the list filters by weekday and category. They are informative: no discount is applied to payments.

## Project structure

```text
app/         Routes, layouts, and loading and error boundaries
  (app)/     Screens behind sign-in
  (auth)/    Sign-in screen
  api/       Route handlers (the scheduled payments cron)
features/    Code grouped by domain: account, auth, cards, categories, deposits, exchange,
             movements, profile, promotions, services, top-ups, transfers
components/  Shared UI with no domain knowledge
lib/         Database client and formatters
prisma/      Schema, migrations and seed
odd/tasks/   Feature documents: requirements, tasks and decision log
proxy.ts     Redirects visitors with no session cookie to sign-in
```

## Decisions

| Topic | Decision | Why |
|-------|----------|-----|
| Money | Integer cents | Floating point cannot represent cents exactly. |
| Database names | Tables, columns, enum types and constraints in Spanish snake_case (`usuarios`, `cuentas.saldo_centavos`, `moneda`), mapped with Prisma `@@map`/`@map`; code identifiers and enum values stay in English | The database reads in the product's language while the code keeps one language. Raw SQL (the row locks) uses the Spanish names. |
| Current user | Single `getCurrentUser()` function | Screens and queries never read cookies or sessions themselves. |
| Passwords | Salted scrypt from `node:crypto` | It resists brute force and adds no dependency. |
| Sessions | Random token in an `httpOnly` cookie, stored as a SHA-256 hash in the database | Logout revokes a session at once, and a database leak exposes no usable token. |
| Route protection | `proxy.ts` checks the cookie, `getCurrentUser()` validates the session | The proxy avoids rendering private screens for anonymous visitors, without a database query on each request. |
| "Recordarme" | 7 day persistent cookie, otherwise a browser-session cookie that expires on the server after 1 day | It follows the checkbox in the design with a short default for a banking app. |
| Data access | Every query filters by `account.userId` | A user cannot read another account by guessing an id. |
| Search and filters | Stored in the URL | They survive a reload and the way back from the detail page. |
| Loading | Suspense boundaries with skeletons | The screen layout appears at once and data streams in. |
| Detail screen | Page at `/movimientos/[id]` | Required by the brief and missing from Figma. It has a URL and natural loading and not-found states. |
| Validation libraries | None | Filters and amounts are parsed by small tested functions. |
| Transfers | One database transaction that locks both accounts with `SELECT … FOR UPDATE` in id order | Concurrent transfers cannot overdraw an account, and two users sending to each other cannot deadlock. Database `CHECK` constraints keep balances non-negative even if the code has a bug. |
| Double submit | An idempotency key generated when the confirmation screen renders | Repeating the request returns the first transfer, so a retry never charges twice. The same key with another amount or recipient is rejected. |
| Transfer reference | Sequential `TRF-000001`, shared by both sides | Sender and recipient see the same operation number, as on a bank receipt. |
| Contacts | Saved only when the sender checks `Guardar a <nombre> en mis contactos` on the confirmation screen; favorites listed first | The list grows from real use without filling up with one-off recipients, and the choice sits on the step the sender already reviews. |
| Recipient lookup | By alias by default, by email behind a button | An alias is easy to share and hides the email. Aliases have 1 to 40 characters (letters without accents, digits and dots, with at least one letter) and ignore case: they are stored in lower case, unique, and checked again by a database `CHECK`. The lookup tells whether an alias or email has an account, as bank transfers show the recipient's name. |
| Quick actions | Ingresar, Transferir, Servicios, Recargas, Tarjetas and Dólares on Home, Ingresar first | One tap to the most common operations; Ingresar funds every other one in the demo. |
| Services | Adhere AySA, Edesur, Edenor or Metrogas with the electronic payment number and a nickname; pay a pending bill with a card of the bill's currency in one transaction that locks the account and then the bill, with an idempotency key; reference `SV-000001` | Same guarantees as transfers, and a bill is paid once: the lock serializes concurrent payments and a unique index on the payment's bill backs it. The number lengths are simulated (AySA 10, Edesur 10, Edenor 12, Metrogas 11, Salud Plena 8, Austral Seguros 9 digits) and checked again by a database `CHECK`. |
| Scheduled payments | A one-off payment on a chosen day, or an automatic debit on the due date, run daily by `/api/pagos-agendados` (Bearer `CRON_SECRET`) or by the demo button | Each run pays through the same locked, idempotent payment with one key per bill, so overlapping runs pay a bill once; under the bill lock the payment checks that the bill is still scheduled with that card, so a cancel never loses to a run. A payment without balance or card ends as failed with a notice and is not retried until the user schedules again or changes the automatic debit, so it never overdraws and never charges by surprise later. |
| Categories | Per-user categories on movements, unique by name ignoring case through a lower-case `key` column; a note on the transfer | The category lives on each movement, so it stays private to that side and a later summary can group movements by it. Deleting a category sets its movements to uncategorized (`ON DELETE SET NULL`). Every write checks that both the movement and the category belong to the user. |
| Deposits | A seeded system user flagged `isTestAccount` sends a regular transfer to the user | Reusing the transfer gives deposits the same locks, idempotency key and movements. The flag keeps the test account out of sign-in, recipient lookups and incoming transfers. |
| Notifications | Derived from stored movements, exchanges, failed payments and reminder settings; a per-user `notificationsSeenAt` gives the unread count | No money flow writes a notification, so none can be missed or duplicated, and the feed always matches the data. |
| Top-ups | SUBE (saved cards with a nickname), phone (Personal, Movistar, Claro, Tuenti) and DirecTV, $100 to $50.000 each, paid with a peso card in one transaction that locks the account, with an idempotency key; reference `RC-000001` | Same guarantees as transfers. A SUBE number is 16 digits starting with 6061 (checked again by a database `CHECK`). A phone number is stored as its 10-digit national number: `+54`, the mobile `9`, the trunk `0` and the legacy `15` after the area code are accepted and removed; `11` numbers read `+54 11 1234 5678` and the rest `+54 351 123 4567`. DirecTV accounts have 8 to 12 digits and receipts show only the last four. |
| Accounts | One account per user and currency (ARS by default, USD optional), each with its own balance, alias and cards | A balance belongs to an account, and cards are ways to use it, as in a bank. Transfers only go between accounts of the same currency. |
| Money format | Argentine everywhere: `$5.000` for pesos, `USD$12,50` for dollars; inputs accept `1.500,50` and reject `12.5` | One format for reading and typing avoids reading a dot as a decimal point. |
| Dollar exchange | Fixed simulated rate of 1 USD = $1.500 in one transaction that locks both accounts, with an idempotency key | Same guarantees as transfers: no overdraft, no deadlock, no double charge. |
| Cards | Visa, Mastercard and American Express validated locally (prefix, length, Luhn, expiry, CVV length); only brand, last four digits, holder and expiry are stored | It shows how the product validates without an external API, and the full number and CVV never reach the database or the logs. Database `CHECK` constraints reject a full number. |
| Perfil | A summary with one screen per change; changing the email or password needs the current password, and a new password closes the other sessions | Editing the login identifier or the password must prove it is the owner. |
| Theme | Light or dark per device, applied before the first paint | Reading a cookie in the root layout would make every page dynamic under Cache Components. |

## Differences from Figma

- **Colors:** sampled from PNG exports, so they are close approximations.
- **"Subscripción":** corrected to "Suscripción", matching "Pago de suscripción" in the same design.
- **Bell:** the brief gives it no behavior; it opens Notificaciones, with the unread count.
- **Logo:** cropped from a PNG export. Replace `public/logo.png` with the original vector.

## Known limitations

- **Contrast:** the yellow amount is hard to read on white. It is kept to follow the design, and the icon and subtitle also convey the movement type.
- **Search:** it ignores case but not accents, so "Jose" does not find "José".
- **List size:** the movement list shows the 50 most recent items, without pagination.
- **Password attempts:** there is no rate limiting on login or on the Perfil changes that ask for the current password, which a real banking app would need.
- **Transfers:** there is no daily limit or second factor, only a limit of 1,000,000 per transfer. Deleting a user also deletes their transfers; no screen deletes users.
- **Top-ups:** simulated: no provider is contacted, a SUBE load still has to be validated at a terminal or in the SUBE app, and phone numbers are not checked against the company. A 4-digit area code is shown grouped 3-3-4, because telling area code lengths apart needs the full numbering plan.
- **Services:** simulated: no company is contacted. Adhering a service creates two pending bills, for the previous and the current month in Buenos Aires time, whose amount (whole pesos from $8.000 to $60.000, or USD 40 to 250 for the dollar companies) and due day (10 to 20) come from a SHA-256 hash of the company, the number and the month, so the same number always gets the same bills. No new bills appear later, and a due bill can still be paid.
- **Exchange rate:** fixed at 1 USD = $1.500 for both buying and selling; there is no spread or live quote.
- **New dollar account:** it starts without a card, so the user adds one in Tarjetas before exchanging.
- **Theme:** the choice is stored in the browser, so it does not follow the user to another device.
- **Native review:** the accounts feature is too large for one native review candidate, so it is verified independently and reviewed in smaller slices (see `odd/tasks/accounts.md`).
