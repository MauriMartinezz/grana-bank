# Suscripciones

Objective: see, add and cancel subscriptions, as the Figma "Pago de suscripción" movements suggest; a demo that charges nothing.
Branch: `feat/accounts`. Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "Hay un último problema, y es que el figma nos condicionó de cierta forma añadiendo la posibilidad de pagar Suscripciones, me imagino  que de manera automática o con la posibilidad de darle de baja a la misma, podrías ver cómo implementar en este sistema las suscripciones?"
- S2. "Que queden como demo". Assumptions: a Subscription has a merchant, an amount, a currency, a card, a billing day and a status (active or cancelled); the seed turns Granate's Adobe, Figma, Spotify and Netflix into active subscriptions; a Suscripciones screen lists them with the next charge date, a detail cancels one after a confirmation, and a small catalog of invented services adds one; nothing charges them.

## Tasks

- [ ] T1 (S2) model, migration, seed, rules and queries.
- [ ] T2 (S2) screens: list, detail with cancel, add from the catalog, entry point.

## Log

- L1 (2026-11-03, user request): see S1.
- L2 (2026-11-03, user): "Que queden como demo".
