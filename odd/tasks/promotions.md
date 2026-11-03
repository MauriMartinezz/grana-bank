# Promociones

Objective: a Promociones screen with a "Promos de hoy" card on Home, invented merchants with a discount and its cap, filtered by weekday and category.
Branch: `feat/accounts` (after Servicios layer 1). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "añadir una pantalla con una card en el home para Promociones? Inventalas o sugiere descuentos, se debe poder filtar por fecha(si es los lunes si es los martes, etc) y por categoría se debe indicar tope del descuento(ejemplo 20% hasta $15.000), sugerencias: alguna tienda de deporte, algún supermercado, cine, alguna cadena de gimnasio, una tienda de ropa, una farmacia". The user approved the proposal: "Sí, después de Servicios".
- S2. Home card "Promos de hoy": the best 2 or 3 promotions of today's weekday (Buenos Aires) and a "Ver todas" link to `/promociones`.
- S3. `/promociones`: weekday chips (Lun–Dom, today selected by default, plus "Todos los días") and category chips (Deportes, Supermercado, Cine, Gimnasio, Ropa, Farmacia), combined and kept in the URL; each promotion shows merchant, discount with its cap ("20% hasta $15.000"), days, card requirement ("Solo Visa" or "Todas tus tarjetas") and validity; a detail screen shows the conditions.
- S4. Invented merchants only (no real brands): Deportes Andes, Súper Ahorro, CineCity, Fit Barrio, Trama, FarmaPlus; about 12 promotions, two per category, stored in a database table filled by the seed. Promotions are informative: no discount is applied to payments.

## Tasks

- [x] T1 (S4) model, migration (Spanish names via @map), catalog, seed and queries. Route: inline. Risk: item 1 (new table; no existing data changes). Commit 8342d42.
- [x] T2 (S2, S3) Home card, list with filters, detail. Route: inline. Risk: item 2 (new guarded routes under `/promociones`).

Assumptions (S3): "Todos los días" shows every promotion whatever its days; a day chip shows the promotions valid that weekday; only promotions in force today (Buenos Aires) are listed; promotions are sorted by discount, then cap, highest first; the URL keeps `dia` (lunes…domingo or todos) and `categoria` (deportes, supermercado, cine, gimnasio, ropa, farmacia); the Home card shows today's best 3. The table is filled by `pnpm db:seed`; until then the screens show an empty state.

## Log

- L1 (2026-11-03, user request): "Qué me decís de añadir una pantalla con una card en el home para Promociones? Inventalas o sugiere descuentos, se debe poder filtar por fecha(si es los lunes si es los martes, etc) y por categoría se debe indicar tope del descuento(ejemplo 20% hasta $15.000), sugerencias: alguna tienda de deporte, algún supermercado, cine, alguna cadena de gimnasio, una tienda de ropa, una farmacia"
- L2 (2026-11-03, user): "Sí, después de Servicios".
- L3 (2026-11-03, user): "Sigue con las promociones".
- L4 (2026-11-03): T1 and T2 done; RED observed for filters, URL builder and queries. vitest 860/860, tsc and eslint clean. The dev database has no promotions until `pnpm db:seed` runs (the seed also recreates the demo users). Not checked in a browser.
- L5 (2026-11-03, user): "Implementa las promociones, son solo demostrativas, no hace falta que sean reales ni que tengan algún comportamiento". They already existed (09a9bbc) but the dev database had none because the seed had not run since. `pnpm db:promos` now loads only the catalog (prisma/promotions.ts, also used by the seed); it loaded 12.
