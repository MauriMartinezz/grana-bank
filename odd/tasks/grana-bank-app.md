# Grana Bank app

Objective: mobile-first banking web app for a technical challenge, following the Figma exports.
Branch: `feat/grana-bank-app`. Delivery strategy: `single-pr` (solo challenge, no review chain). Test runner: Vitest.

## Specs

- S1. Stack: Next.js + TypeScript + PostgreSQL + Prisma. "Solo estas tecnologías como principales."
- S2. "Mostrar una lista de elementos": movements list.
- S3. "Permitir ver el detalle de un elemento": dedicated page at `/movements/[id]`, approved by the user. Not present in Figma.
- S4. "Manejo básico de estados: loading, error y estado vacío", with skeletons on the front end.
- S5. "La aplicación debe ser funcional y navegable."
- S6. Login: "Debés poder iniciar sesión con estas credenciales" (values in the Figma brief).
- S7. Home: "Al hacer clic en la lupa de “Últimos movimientos” tiene que llevarte a la pantalla de Movimientos."
- S8. Movimientos: "Tiene que tener una búsqueda por nombre de persona o servicio." "Tiene que tener filtros rápidos." Filters: Todos, Suscripción, Recibido, Enviado.
- S9. Screens follow the Figma exports (Login, Home, Movimientos, bottom navigation with logout). Colors are approximated from PNG files.
- S10. During development login works without a user. Real auth (seeded user, scrypt hash, DB session, httpOnly cookie) is implemented close to delivery. A single current-user seam exists from day one, and the dev bypass must fail in production.
- S11. One account per user, single currency. No features beyond the brief.
- S12. Amounts are stored as integer cents.
- S13. Bell has no specified behavior: it stays visible and tells the user "No tenés notificaciones".
- S14. UI copy in Spanish, as designed. "Subscripción" is corrected to "Suscripción".

## Tasks

- [x] T1 (S1, S11, S12) inline: Postgres, Prisma schema, migration, seed.
- [x] T2 (S9, S14) inline: design tokens, fonts, app shell, bottom navigation.
- [x] T3 (S4, S7, S10, S13) inline: current-user seam and Home.
- [x] T4 (S2, S4, S8) inline: Movimientos with search and filters.
- [x] T5 (S3, S4) inline: movement detail.
- [x] T6 (S5, S9, S10) inline: Login screen with dev bypass.
- [x] T7 (S6, S10) inline: real auth, commits cd5895b, 4a82dfe, 9256640, 917c2e3.

Route evidence: no writer reason applies. Units depend on each other, so all tasks run inline.

## Log

- L1 (2026-11-01, user request): "Bien, esto es una aplicación bancaria web pero en principio Mobile. La idea es hacer una aplicaición fullstack con: NextJS + Typescript + Postgres + Prisma como ORM. Solo estas tecnologías como principales. Esto forma parte de un challenge técnico por lo que puedes hacerme preguntas varias que consideres relevantes que vaya aprendiendo y familiarizando del proyecto. Considera que debe tener 4 pantallas principales: Login, Home y Movimientos. Hay que manejar los estados: loading, error, vacio (aplicar skeletons en front). La aplicación debe seguir buenas prácticas de UX"
- L2 (2026-11-01, user): "De momento puede loguearse sin usuario mientras dure el desarrollo y luego, más cerca de la entrega, implementar la autenticación, aunque ya puede estar pensada desde ahora"
- L3 (2026-11-01, user): "Siento que si añado por añadir para lucirme pensarán que estoy haciendo estupideces to show off"
- L4 (2026-11-01): Prisma pinned to 7.10.1 because the npm `latest` tag points to 8.0.0-rc.29.
- L5 (2026-11-01): Next.js config has `cacheComponents` and `partialPrefetching` on, so request-time reads live inside Suspense boundaries.
- L6 (2026-11-01): Bugs found by running the app: `usePathname` in the bottom nav blocked prerendering of the dynamic route, and the dev bypass ran during `next build`. Fixed with a Suspense boundary and `connection()`.
- L7 (2026-11-01): Verified in a scratch copy: 22 Vitest tests, 18 browser flow checks with no console errors, forced skeleton, empty, error and retry states, production build, and production guard (`/home` serves no data).
- L8 (2026-11-01): Next step: T7, when the user decides delivery is close. The user's running dev server served stale CSS and needs a restart.
- L9 (2026-11-01): Independent verifier found no blockers for the production guard, data isolation and secrets. Accepted advisories fixed: literal `%` and `_` in search, and filter click racing the search debounce. 23 tests and 18 browser checks pass.
- L10 (2026-11-01): Native review approved and acknowledged for the app code (lineage review-ac6c439a70976c39, base 5c6423e). The DB and dependency commit did not fit the review budget and stays out of that review. Fixed review advisories: inherited Object names in the type filter, filter click resetting the input, unstable order for equal dates.
- L11 (2026-11-01, user): "bien, podrías fraccionarlo en diferentes commits? para que no sea un big ass commit"
- L12 (2026-11-01): History rewritten into 18 work-unit commits with an identical final tree. Commit ids in L10 refer to the previous history; the reviewed code is the same. Every commit passes type checks and its tests.
- L13 (2026-11-01, user): gave the login password from the brief. The value is redacted here on purpose: it is never stored in the repository, and the seed reads it from `SEED_USER_PASSWORD`.
- L14 (2026-11-01): T7 route inline, no writer reason. Design: scrypt from `node:crypto`, random session token stored only as a SHA-256 hash, `proxy.ts` as an optimistic cookie check, `getCurrentUser()` as the real check. "Recordarme" keeps a persistent cookie for 7 days; otherwise a browser-session cookie backed by a 1 day server expiry. The migration keeps existing rows with an unusable hash, so it needs no reset.
- L15 (2026-11-01): Independent verifier passed S6, S10 and S5 and failed S4 with two blockers, both only during a database outage: `/login` crashed for a visitor with a session cookie, and logout crashed and kept the cookie. Both fixed with regression tests. Accepted advisories also fixed: a failed login cleared Recordarme, the proxy matcher test was tautological, and the login page read the session directly. Declined advisories: no rate limiting (documented in the README), timing of unmigrated `'!'` rows, and passwords over 1 MB (413 from Next).
- L16 (2026-11-01): Evidence after the fix: 54 Vitest tests, type check, lint and production build pass. Firefox against `next start`: 30 checks on the normal flow, 7 checks with the database unreachable. The user still has to confirm the password value against Figma, because the verifier and the parent could not see the brief.
- L17 (2026-11-01): Native review granted by the user and approved (lineage review-be99432a066ead4a, base ac3956b, high risk, lenses risk, resilience and reliability). It found one critical candidate-caused defect, confirmed by measurement: the email pattern took quadratic time, about 36 s for a 200 KB field, on an anonymous request. Fixed in 917c2e3 by checking the 254 character limit first. Non-blocking advisories left: no rate limiting (documented), and no test asserts the `secure` cookie flag (the browser flow checks it). 55 Vitest tests pass.
