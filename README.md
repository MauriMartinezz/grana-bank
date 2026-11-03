# GranaBank

Mobile-first home banking web app built for a technical challenge. A user signs in and manages one account per currency (pesos, and optionally dollars): transfers, dollar exchange, cards, top-ups, service payments with scheduling, categories, deposits from a test account and promotions. Everything runs locally against a PostgreSQL database in Docker; no real bank, card network or company is contacted.

## Documentation

| Document | Read it to |
|----------|------------|
| [docs/FEATURES.md](docs/FEATURES.md) | See every feature, what is a demo, differences from Figma and known limitations |
| [docs/DEMO.md](docs/DEMO.md) | Sign in with the test users, know who you can send money to, and try each flow |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Understand the technical choices: cents and `BIGINT`, Next.js, Server Actions, locks, idempotency, security |

## Contents

- [Features](#features)
- [Stack](#stack)
- [Requirements](#requirements)
- [Run it locally](#run-it-locally)
- [Everyday commands](#everyday-commands)
- [Troubleshooting](#troubleshooting)
- [Try it](#try-it)
- [Project structure](#project-structure)

## Features

| Area | What the user can do |
|------|----------------------|
| Sign in | Email and password, "Recordarme", logout from Perfil |
| Home | Balance per account (the eye hides it as `*****`), quick actions, upcoming bills, today's promotions, latest movements |
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

Sign in as `soygranate@clublanus.com` with the brief's password. The seed also creates Juan Perez (`juan.perez`, `juan.perez.usd`) and Martin Bozzini (`martin.bozzini`) to receive transfers, and the "Cuenta de prueba" that funds **Ingresar dinero**. [docs/DEMO.md](docs/DEMO.md) lists every user, account, card and balance, who you can send money to, and a step-by-step tour of each flow.

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
docs/        Features, demo guide and technical decisions
odd/tasks/   Feature documents: requirements, tasks and decision log
proxy.ts     Redirects visitors with no session cookie to sign-in
```
