# Suscripciones

Objective: see, add and cancel subscriptions, as the Figma "Pago de suscripción" movements suggest; a demo that charges nothing.
Branch: `feat/accounts`. Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "Hay un último problema, y es que el figma nos condicionó de cierta forma añadiendo la posibilidad de pagar Suscripciones, me imagino  que de manera automática o con la posibilidad de darle de baja a la misma, podrías ver cómo implementar en este sistema las suscripciones?"
- S2. "Que queden como demo". Assumptions: a Subscription has a merchant, an amount, a currency, a card, a billing day and a status (active or cancelled); the seed turns Granate's Adobe, Figma, Spotify and Netflix into active subscriptions; a Suscripciones screen lists them with the next charge date, a detail cancels one after a confirmation, and a small catalog of invented services adds one; nothing charges them.

## Tasks

- [x] T1 (S2) model, migration, seed, rules and queries. Model, migration and catalog done by the parent (commit after 4b40aa7); seed, rules and queries delegated with T2.
- [x] T2 (S2) screens: list, detail with cancel and card change, add from the catalog. Route: delegated (parallel writer). The Perfil entry row is added by the parent after the desktop writer finishes (shared file).

## Log

- L1 (2026-11-03, user request): see S1.
- L2 (2026-11-03, user): "Que queden como demo".
- L3 (2026-11-03, user): "puedes asignar varios agentes a trabajar en las distintas cosas que están pendientes?"
- L4 (2026-11-03, T1+T2 writer): seed gives Granate SEEDED_SUBSCRIPTIONS as ACTIVE ARS subscriptions on the peso card (prisma/seed.ts). features/subscriptions/queries.ts (listSubscriptions active-by-next-charge then cancelled newest first, getSubscription owner-only, listPreviousCharges = owner's SUBSCRIPTION movements of the merchant, newest first, 5); actions.ts ("use server": subscribe, cancelSubscription, changeSubscriptionCard, all scoped by userId); client forms change-card-form.tsx, cancel-form.tsx (window.confirm), subscribe-form.tsx; screens app/(app)/suscripciones (list, [id] detail with not-found, nueva catalog; loading.tsx each), each saying it is a demo. RED: `npx vitest run features/subscriptions` failed with both test files unable to import ./queries and ./actions (no tests ran). GREEN: 14/14 passed (queries ordering/ownership/previous charges; subscribe, unknown slug, duplicate active, resubscribe after cancel, no ARS card; cancel idempotent and owner-only; change card same-currency, owner-only, not when cancelled). `npx tsc --noEmit` clean; eslint on the surfaces clean. Seed not run (parent owns it). Detail page types params explicitly because the generated route types do not yet list /suscripciones/[id].
