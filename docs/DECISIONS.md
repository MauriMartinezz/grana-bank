# Technical decisions

Why GranaBank is built the way it is. Each section states the decision first, then the reason.

## Money

### Integer cents, never floating point

Every amount is stored and computed as an integer number of cents: `$1.500,50` is `150050`.

Floating point numbers are binary fractions: `0.1 + 0.2` is `0.30000000000000004`. A balance that adds and subtracts such values drifts by fractions of a cent, and comparing it with an amount (`balance >= amount`) can give the wrong answer. Integers are exact, so a balance is always the sum of its movements.

### `BIGINT` in the database and `bigint` in TypeScript

Balances and amounts are `BIGINT` columns, read by Prisma as JavaScript `bigint`.

A 32-bit `INTEGER` caps at 2.147.483.647 cents, about $21 million, which a balance can exceed. A JavaScript `number` is exact only up to 2^53, and mixing it with currency math invites silent rounding. `bigint` keeps every operation exact at any size, and TypeScript refuses to mix it with `number` by accident. Typed amounts are parsed into cents by small tested functions (`parseAmountToCents`), and a single transfer is capped at 1.000.000, so form values stay safe integers until they become `bigint`.

### One Argentine format for reading and typing

`$5.000` for pesos and `USD$12,50` for dollars; inputs accept `1.500,50` and reject `12.5`. A dot is never a decimal point, so nobody types 12,50 and gets 125.

## Framework

### Next.js with the App Router

Next.js renders on the server, which suits a bank: balances and movements are read next to the database, never through a public JSON API, and the browser only receives HTML and the little JavaScript each interaction needs. File-based routes give every screen a URL, so the back button, reloads and shared links work, and `loading.tsx`, `error.tsx` and `not-found.tsx` give each route its loading, error and empty states for free.

### Server Actions for every change

Forms post to Server Actions instead of hand-written API routes. They run on the server with the user's session, the form works before JavaScript loads, and there is no request or response schema to keep in sync between client and server. Each action validates its input again, whatever the form already checked, because a Server Action is a public endpoint. The one Route Handler is `/api/pagos-agendados`, which a cron calls without a session.

### Cache Components and Suspense

Static parts of a screen render at once and data streams in behind Suspense boundaries with skeletons. This is also why per-device preferences (theme, hidden balance, view) live in `localStorage` and are applied by tiny scripts in `<head>`: reading a cookie in the root layout would make every page dynamic.

### PostgreSQL and Prisma

PostgreSQL gives real transactions, row locks (`SELECT … FOR UPDATE`) and `CHECK` constraints, which the money flows rely on. Prisma gives typed queries and versioned migrations; raw SQL is used only for the row locks.

### Spanish database names, English code

Tables, columns and constraints are Spanish snake_case (`cuentas.saldo_centavos`), mapped with `@map`/`@@map`; code identifiers stay in English. The database reads in the product's language and the code keeps one language.

## Correctness of money flows

### One transaction with row locks

Transfers, exchanges, top-ups, service payments and deposits run in one database transaction that locks the affected account rows with `SELECT … FOR UPDATE`, always in the same order (by id). Concurrent operations on the same account wait for each other, so the balance check always sees the latest balance and two users sending to each other cannot deadlock. `CHECK` constraints keep balances non-negative even if the code had a bug.

### Idempotency keys

The confirmation screen gets a random key in its URL, and the operation stores it with a unique index. A double tap, a retry after a network error or the back button replays the same key and gets the first result: nothing is charged twice. The same key with another amount or recipient is rejected.

### Scheduled payments are idempotent too

A scheduled or automatic service payment uses one key per bill, so overlapping cron runs pay a bill once, and under the bill lock it checks that the bill is still scheduled with that card. A payment without balance ends as failed and is not retried until the user acts, so it never charges by surprise later.

## Security

| Decision | Why |
|----------|-----|
| Passwords hashed with salted scrypt from `node:crypto` | Resists brute force and adds no dependency |
| A random session token in an `httpOnly` cookie, stored as a SHA-256 hash | Logout revokes a session at once, and a database leak exposes no usable token |
| `proxy.ts` checks the cookie; `getCurrentUser()` validates the session | The proxy avoids rendering private screens for visitors without a database query; screens and queries never read cookies themselves |
| Every query filters by the owner (`account.userId`) | A user cannot read another account by guessing an id |
| Cards store only brand, last four digits, holder and expiry | The full number and CVV never reach the database or the logs |
| The test account is flagged `isTestAccount` | It cannot sign in, be found as a recipient or receive money |

## Product shape

| Decision | Why |
|----------|-----|
| Notifications are derived from stored data | No money flow writes a notification, so none can be missed or duplicated |
| Demo features (scheduled deposits and top-ups, subscriptions) save and list, never charge | The user asked for them as demos; real charging needs the same locks and idempotency as the scheduled service payments |
| Simulated companies, bills and rates | No real company, card network or exchange is contacted; dollar-billing companies are invented |
| Filters and search in the URL | They survive a reload and the way back from a detail |
| No validation library | Amounts, aliases, cards and dates are parsed by small tested functions |

## Testing

Vitest runs unit tests for the pure rules and integration tests against the real PostgreSQL database, because locks, unique indexes and `CHECK` constraints are part of the behavior and a mock would hide them. Concurrency is tested by firing many requests at once and checking that money moves exactly once.

## Reference table


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
| Hidden balance | An eye on the balance card swaps every balance for `*****`, per device, applied before the first paint like the theme | The amount never flashes on screen before hiding, which matters for privacy in public. |
| Theme | Light or dark per device, applied before the first paint | Reading a cookie in the root layout would make every page dynamic under Cache Components. |

