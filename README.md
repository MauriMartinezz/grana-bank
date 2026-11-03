# GranaBank

Mobile-first banking web app built for a technical challenge. It has login, a home screen with one account per currency (pesos by default, dollars optional), quick actions and recent movements, a searchable movement list with a detail page, transfers between users with contacts and favorites, dollar buy and sell at a simulated rate, cards, and a Perfil screen with light and dark themes.

**Stack:** Next.js, TypeScript, PostgreSQL and Prisma. Vitest runs the tests.

## Quick path

Requires Node 22, pnpm and Docker.

```bash
cp .env.example .env
pnpm install
pnpm db:up        # Postgres on port 5433
pnpm db:migrate
SEED_USER_PASSWORD='<password from the brief>' pnpm db:seed
pnpm dev
```

Open http://localhost:3000 in a mobile viewport.

After pulling changes that touch `prisma/`, run `pnpm db:migrate` and restart `pnpm dev`: a running server keeps the Prisma client it loaded at start. If routes from another branch still show, stop the server, delete `.next` and start it again.

Scheduled and automatic service payments run when something calls `/api/pagos-agendados` (`GET` or `POST`) with `Authorization: Bearer $CRON_SECRET`, for example a daily cron. While `CRON_SECRET` is unset, the endpoint answers 401 to every request. For a local try: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/pagos-agendados`. It answers `{"paid":N,"failed":N}`.

| Command | Purpose |
|---------|---------|
| `pnpm test` | Unit and integration tests. The database must be running. |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |

Sign in with the credentials from the brief. The seed reads the password from `SEED_USER_PASSWORD`, so it is never stored in the repository.

### Demo users

The seed creates two more users who exist to receive transfers. They sign in with the same password as the main user.

| Email | Aliases (ARS / USD) | Name | Starts as |
|-------|---------------------|------|-----------|
| `soygranate@clublanus.com` | `soy.granate` / `soy.granate.usd` | Soy Granate | Main user from the brief, with a peso and a dollar account |
| `juanperez@clublanus.com` | `juan.perez` / `juan.perez.usd` | Juan Perez | A contact of Soy Granate |
| `martinbozzini@clublanus.com` | `martin.bozzini` | Martin Bozzini | Pesos only, not a contact: use "Nuevo destinatario" |

To show a transfer from both sides:

1. Sign in as Granate and tap **Transferir**.
2. Tap **Nuevo destinatario**, enter the alias `martin.bozzini` (or tap **Transferir por email** and use the email), an amount, and confirm.
3. Sign out and sign in as Martin Bozzini: the balance and a "Pago recibido" from Soy Granate are there.

A dollar transfer works the same way to `juan.perez.usd`, from the dollar account. To try the exchange, tap **Dólares** on Home: buying debits pesos at 1 USD = $1.500 and credits dollars; selling does the reverse.

To try a top-up, tap **Recargas** on Home: Granate starts with the SUBE card "sube de mauri" (`6061 2345 6789 0123`); Telefonía and DirecTV take a phone or customer number. Each top-up debits the peso account through the chosen card.

To pay a service, tap **Servicios** on Home: Granate starts with the Edesur service "Luz depto" (payment number `0012345678`) and its two simulated bills, last month's (already due) and this month's. **Adherir servicio** adds AySA, Edesur, Edenor or Metrogas, billed in pesos, or Salud Plena (Prepaga) or Austral Seguros (Seguro), two fictional companies billed in dollars and paid only from the dollar account's cards. Every service payment is filed under the user's Servicios category, editable from the movement detail. On a bill, **Programar el pago** picks a day up to the due date and a card; on a service, **Débito automático** pays every bill on its due date. **Procesar pagos agendados**, at the bottom of Servicios, runs today's payments of the signed-in user without waiting for the cron. Home lists the next bills that nothing pays by itself, with "Vence en N días".

A transfer can carry a note, shown to both sides, and a category, private to the sender. Every user starts with Alquiler, Comida, Servicios, Regalos and Otros; **Perfil → Categorías** adds, renames and deletes them, and the detail of any movement (transfers, top-ups, service payments) changes its category.

**Ingresar dinero**, a Home quick action, adds up to $1.000.000 or USD 10.000 at a time from the "Cuenta de prueba", a demo account the seed creates (`pnpm db:seed`). It arrives as a payment received. The test account cannot sign in and is never found as a recipient.

Running the seed again resets all three users.

## Project structure

```text
app/         Routes, layouts, and loading and error boundaries
features/    Code grouped by domain: account, auth, cards, exchange, movements, profile, services, top-ups, transfers
components/  Shared UI with no domain knowledge
lib/         Database client and formatters
prisma/      Schema, migrations and seed
proxy.ts     Redirects visitors with no session cookie to login
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
| Quick actions | Transferir, Servicios, Recargas, Tarjetas and Dólares on Home | One tap to the most common operations. |
| Services | Adhere AySA, Edesur, Edenor or Metrogas with the electronic payment number and a nickname; pay a pending bill with a card of the bill's currency in one transaction that locks the account and then the bill, with an idempotency key; reference `SV-000001` | Same guarantees as transfers, and a bill is paid once: the lock serializes concurrent payments and a unique index on the payment's bill backs it. The number lengths are simulated (AySA 10, Edesur 10, Edenor 12, Metrogas 11, Salud Plena 8, Austral Seguros 9 digits) and checked again by a database `CHECK`. |
| Scheduled payments | A one-off payment on a chosen day, or an automatic debit on the due date, run daily by `/api/pagos-agendados` (Bearer `CRON_SECRET`) or by the demo button | Each run pays through the same locked, idempotent payment with one key per bill, so overlapping runs pay a bill once; under the bill lock the payment checks that the bill is still scheduled with that card, so a cancel never loses to a run. A payment without balance or card ends as failed with a notice and is not retried until the user schedules again or changes the automatic debit, so it never overdraws and never charges by surprise later. |
| Categories | Per-user categories on movements, unique by name ignoring case through a lower-case `key` column; a note on the transfer | The category lives on each movement, so it stays private to that side and a later summary can group movements by it. Deleting a category sets its movements to uncategorized (`ON DELETE SET NULL`). Every write checks that both the movement and the category belong to the user. |
| Deposits | A seeded system user flagged `isTestAccount` sends a regular transfer to the user | Reusing the transfer gives deposits the same locks, idempotency key and movements. The flag keeps the test account out of sign-in, recipient lookups and incoming transfers. |
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
- **Bell:** the brief gives it no behavior, so it reports that there are no notifications.
- **Logo:** cropped from a PNG export. Replace `public/logo.png` with the original vector.

## Known limitations

- **Contrast:** the yellow amount is hard to read on white. It is kept to follow the design, and the icon and subtitle also convey the movement type.
- **Search:** it ignores case but not accents, so "Jose" does not find "José".
- **List size:** the movement list shows the 50 most recent items, without pagination.
- **Password attempts:** there is no rate limiting on login or on the Perfil changes that ask for the current password, which a real banking app would need.
- **Transfers:** there is no daily limit or second factor, only a limit of 1,000,000 per transfer. Deleting a user also deletes their transfers; no screen deletes users.
- **Top-ups:** simulated: no provider is contacted, a SUBE load still has to be validated at a terminal or in the SUBE app, and phone numbers are not checked against the company. A 4-digit area code is shown grouped 3-3-4, because telling area code lengths apart needs the full numbering plan.
- **Services:** simulated: no company is contacted. Adhering a service creates two pending bills, for the previous and the current month in Buenos Aires time, whose amount (whole pesos from $8.000 to $60.000) and due day (10 to 20) come from a SHA-256 hash of the company, the number and the month, so the same number always gets the same bills. No new bills appear later, and a due bill can still be paid.
- **Exchange rate:** fixed at 1 USD = $1.500 for both buying and selling; there is no spread or live quote.
- **New dollar account:** it starts without a card, so the user adds one in Tarjetas before exchanging.
- **Theme:** the choice is stored in the browser, so it does not follow the user to another device.
- **Native review:** the accounts feature is too large for one native review candidate, so it is verified independently and reviewed in smaller slices (see `odd/tasks/accounts.md`).
