# Cards

Objective: let the user add more cards to their account, validating the brand locally.
Branch: `feat/transfers` (after the transfers feature). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "deben poder añadirse más tarjetas". An account has one or more cards. The existing card of each account is kept.
- S2. "a la hora de crear el formulario para dar de alta una tarjeta, debe validarse si es Visa, Master o American Express". Any other brand is rejected.
- S3. "no es necesario conectarse a una API o algo por el estilo pero algo básico para mostrar como pensamos el producto": validation is local (prefix, length, Luhn check, expiry not in the past, CVV length per brand).
- S4. Assumption: only brand, last 4 digits, holder and expiry are stored. The full number and the CVV are never stored or logged.
- S5. Assumption: a "Mis tarjetas" screen lists the cards and has the "Agregar tarjeta" form. The form shows the detected brand while typing. Home keeps showing the first card.
- S6. UI copy in Spanish, existing visual style, loading, error and empty states.

## Tasks

- [ ] T1 (S1, S4) inline: Card model, migration that moves the existing card fields, seed.
- [ ] T2 (S2, S3) inline: card validation with tests.
- [ ] T3 (S2, S5, S6) inline: Mis tarjetas screen and add card form.

Route evidence: no writer reason applies; T2 and T3 depend on T1. Risk: item 1 (the migration moves existing stored data) applies to T1.

## Log

- L1 (2026-11-03, user request): "Bien, prosiguiendo con más features, deben poder añadirse más tarjetas, a la hora de crear el formulario para dar de alta una tarjeta, debe validarse si es Visa, Master o American Express, no es necesario conectarse a una API o algo por el estilo pero algo básico para mostrar como pensamos el producto"
- L2 (2026-11-03): Starts after the transfers feature, so two migrations are not in flight at once.
- L-default (2026-11-03, user): "Se debe poder configurar una tarjeta como predeterminada (ejemplo, la tarjeta X debe ser la predeterminada para pagar en pesos) (si tengo 1 sola esa será la predeterminada)". Also "Qué sentido tiene tener diferentes tarjetas en pesos si están atadas a una cuenta?..." → user chose option A: cards keep sharing the account balance. Done: `Account.defaultCardId` (migration 20261104120000_default_card, SET NULL when the card is removed); the default is the chosen card or the oldest; it comes first and preselected in every picker (Home, Dólares, Recargas, Servicios), a sent transfer records it, a new subscription uses it; the card page sets it; Tarjetas marks it; Home shows the balance once and the cards in a carousel when the account has several. RED observed for the rule, the action and the usage. vitest 949/949.
