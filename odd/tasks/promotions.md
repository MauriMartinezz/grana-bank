# Promociones

Objective: a Promociones screen with a "Promos de hoy" card on Home, invented merchants with a discount and its cap, filtered by weekday and category.
Branch: `feat/accounts` (after Servicios layer 1). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "añadir una pantalla con una card en el home para Promociones? Inventalas o sugiere descuentos, se debe poder filtar por fecha(si es los lunes si es los martes, etc) y por categoría se debe indicar tope del descuento(ejemplo 20% hasta $15.000), sugerencias: alguna tienda de deporte, algún supermercado, cine, alguna cadena de gimnasio, una tienda de ropa, una farmacia". The user approved the proposal: "Sí, después de Servicios".
- S2. Home card "Promos de hoy": the best 2 or 3 promotions of today's weekday (Buenos Aires) and a "Ver todas" link to `/promociones`.
- S3. `/promociones`: weekday chips (Lun–Dom, today selected by default, plus "Todos los días") and category chips (Deportes, Supermercado, Cine, Gimnasio, Ropa, Farmacia), combined and kept in the URL; each promotion shows merchant, discount with its cap ("20% hasta $15.000"), days, card requirement ("Solo Visa" or "Todas tus tarjetas") and validity; a detail screen shows the conditions.
- S4. Invented merchants only (no real brands): Deportes Andes, Súper Ahorro, CineCity, Fit Barrio, Trama, FarmaPlus; about 12 promotions, two per category, stored in a database table filled by the seed. Promotions are informative: no discount is applied to payments.

## Tasks

- [ ] T1 (S4) model, migration (Spanish names via @map) and seed.
- [ ] T2 (S2, S3) Home card, list with filters, detail.

## Log

- L1 (2026-11-03, user request): "Qué me decís de añadir una pantalla con una card en el home para Promociones? Inventalas o sugiere descuentos, se debe poder filtar por fecha(si es los lunes si es los martes, etc) y por categoría se debe indicar tope del descuento(ejemplo 20% hasta $15.000), sugerencias: alguna tienda de deporte, algún supermercado, cine, alguna cadena de gimnasio, una tienda de ropa, una farmacia"
- L2 (2026-11-03, user): "Sí, después de Servicios".
