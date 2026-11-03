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

Running the seed again resets all three users.

## Project structure

```text
app/         Routes, layouts, and loading and error boundaries
features/    Code grouped by domain: account, auth, cards, exchange, movements, profile, transfers
components/  Shared UI with no domain knowledge
lib/         Database client and formatters
prisma/      Schema, migrations and seed
proxy.ts     Redirects visitors with no session cookie to login
```

## Decisions

| Topic | Decision | Why |
|-------|----------|-----|
| Money | Integer cents | Floating point cannot represent cents exactly. |
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
| Contacts | Saved after the first transfer; favorites listed first | The list grows from real use, with no extra "add contact" step. |
| Recipient lookup | By alias by default, by email behind a button | An alias is easy to share and hides the email. Aliases have 1 to 40 characters (letters without accents, digits and dots, with at least one letter) and ignore case: they are stored in lower case, unique, and checked again by a database `CHECK`. The lookup tells whether an alias or email has an account, as bank transfers show the recipient's name. |
| Quick actions | Transferir, Servicios, Recargas, Tarjetas and Dólares on Home | Servicios and Recargas are entry points for planned features and show "Próximamente". |
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
- **Exchange rate:** fixed at 1 USD = $1.500 for both buying and selling; there is no spread or live quote.
- **New dollar account:** it starts without a card, so the user adds one in Tarjetas before exchanging.
- **Theme:** the choice is stored in the browser, so it does not follow the user to another device.
- **Native review:** the accounts feature is too large for one native review candidate, so it is verified independently and reviewed in smaller slices (see `odd/tasks/accounts.md`).
