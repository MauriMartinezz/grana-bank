# GranaBank

Mobile-first banking web app built for a technical challenge. It has login, a home screen with balance, quick actions and recent movements, a searchable movement list, a movement detail page, and transfers between users with a contact list and favorites.

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

| Command | Purpose |
|---------|---------|
| `pnpm test` | Unit and integration tests. The database must be running. |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |

Sign in with the credentials from the brief. The seed reads the password from `SEED_USER_PASSWORD`, so it is never stored in the repository.

### Demo users

The seed creates two more users who exist to receive transfers. They sign in with the same password as the main user.

| Email | Name | Starts as |
|-------|------|-----------|
| `soygranate@clublanus.com` | Granate | Main user from the brief |
| `juanperez@clublanus.com` | Juan Perez | A contact of Granate |
| `martinbozzini@clublanus.com` | Martin Bozzini | Not a contact: use "Nuevo destinatario" |

To show a transfer from both sides:

1. Sign in as Granate and tap **Transferir**.
2. Tap **Nuevo destinatario**, enter `martinbozzini@clublanus.com`, an amount, and confirm.
3. Sign out and sign in as Martin Bozzini: the balance and a "Pago recibido" from Granate are there.

Running the seed again resets all three users.

## Project structure

```text
app/         Routes, layouts, and loading and error boundaries
features/    Code grouped by domain: account, auth, movements, transfers
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
| Detail screen | Page at `/movements/[id]` | Required by the brief and missing from Figma. It has a URL and natural loading and not-found states. |
| Validation libraries | None | Filters and amounts are parsed by small tested functions. |
| Transfers | One database transaction that locks both accounts with `SELECT … FOR UPDATE` in id order | Concurrent transfers cannot overdraw an account, and two users sending to each other cannot deadlock. Database `CHECK` constraints keep balances non-negative even if the code has a bug. |
| Double submit | An idempotency key generated when the confirmation screen renders | Repeating the request returns the first transfer, so a retry never charges twice. The same key with another amount or recipient is rejected. |
| Transfer reference | Sequential `TRF-000001`, shared by both sides | Sender and recipient see the same operation number, as on a bank receipt. |
| Contacts | Saved after the first transfer; favorites listed first | The list grows from real use, with no extra "add contact" step. |
| Recipient lookup | By email | It is the only identifier users have. The lookup tells whether an email has an account, as bank transfers show the recipient's name. |
| Quick actions | Transferir, Servicios, Recargas and Tarjetas on Home | Servicios, Recargas and Tarjetas are entry points for planned features and show "Próximamente". |

## Differences from Figma

- **Colors:** sampled from PNG exports, so they are close approximations.
- **"Subscripción":** corrected to "Suscripción", matching "Pago de suscripción" in the same design.
- **Bell:** the brief gives it no behavior, so it reports that there are no notifications.
- **Logo:** cropped from a PNG export. Replace `public/logo.png` with the original vector.

## Known limitations

- **Contrast:** the yellow amount is hard to read on white. It is kept to follow the design, and the icon and subtitle also convey the movement type.
- **Search:** it ignores case but not accents, so "Jose" does not find "José".
- **List size:** the movement list shows the 50 most recent items, without pagination.
- **Login attempts:** there is no rate limiting, which a real banking app would need.
- **Transfers:** there is no daily limit or second factor, only a limit of 1,000,000 per transfer. Deleting a user also deletes their transfers; no screen deletes users.
- **Card logo:** the Home card always shows the Mastercard logo; the cards feature replaces it.
