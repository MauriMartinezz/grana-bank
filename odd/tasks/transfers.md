# Transfers

Objective: let the logged-in user transfer money to other seeded users from a contacts screen, with favorites and a new-recipient flow.
Branch: `feat/transfers` (from `feat/grana-bank-app` at db44268). Delivery strategy: `single-pr` (solo challenge, same as the app feature). Test runner: Vitest.

## Specs

- S1. "Crear una cuenta para poder simular transferencias de dinero": seeded recipient users with their own account, "para poder testear y mostrar en la prueba técnica". No sign-up screen.
- S2. Recipient users can log in, so the demo shows the money arriving on the other side. Assumption: they use the same `SEED_USER_PASSWORD` as the main user.
- S3. Assumption: two recipients are seeded. One is already a contact of the main user, the other is not, so the "nuevo usuario" flow can be shown.
- S4. "Deberá haber un botón Transferir en el que te llevará a una pantalla con una lista de contactos".
- S5. Contacts: "con la posibilidad de añadir como favorito". Favorites are listed first. A favorite can be removed again.
- S6. "o la posibilidad de transferir a un nuevo usuario". Assumption: the new recipient is identified by email. After a successful transfer the recipient is saved as a contact.
- S7. A transfer is atomic: it decreases the sender balance, increases the recipient balance, and creates a `SENT` movement for the sender and a `RECEIVED` movement for the recipient. Both movements appear in Movimientos and in the movement detail.
- S8. A transfer is rejected, with a clear message in Spanish and no data change, when: the amount is not positive or has more than 2 decimals, the balance is insufficient, the recipient does not exist, or the recipient is the sender.
- S9. Two concurrent transfers can never take the balance below zero. A double submit creates one transfer.
- S10. Flow: contacts or new recipient, then amount, then confirmation, then a success screen that links to the movement. Loading, error and empty states as in the app feature (S4 there).
- S11. No Figma design exists: screens follow the existing visual style. UI copy in Spanish.
- S12. Amounts stay integer cents end to end, parsed from text without floating point.
- S13. Access points for "pago de servicios" and "cargar tarjetas (aquí se podrán cargar tarjetas prepago de compañías de teléfono, de televisión satelital o cargar la tarjeta de transporte)": "no hace falta implementar todavía pero sí agregar los puntos de acceso". "Puede haber un acceso rápido en el Home, se me ocurre debajo de la tarjeta y arriba de últimos movimientos en forma de cards y que vayan 4 accesos directos por fila". The four are Transferir, Servicios, Recargas and Tarjetas (the last one leads to the cards feature). Unbuilt ones open a "Próximamente" screen.

## Tasks

- [x] T1 (S1, S2, S3, S12) inline: schema (Contact, transfer link), migration, seed. Commit 98a16cd.
- [x] T2 (S7, S8, S9, S12) inline: transfer service and amount parsing, with tests. Commit fcbaeb5.
- [x] T3 (S4, S5, S11, S13) inline: Home quick actions, "Próximamente" screens, contacts screen with favorites, proxy covers the new routes. Commit d08aba8.
- [x] T4 (S6, S8, S9, S10) inline: new recipient, amount, confirmation and success screens; reused idempotency key with other values is rejected (review advisory).
- [x] T5 (S2, S3) inline: README demo users, transfer flow and decisions.

Route evidence: no writer reason applies. T3 and T4 depend on T1 and T2, so all tasks run inline. Risk: item 1 (migration) and item 4 (concurrent balance updates) apply to T1 and T2, so they get an independent verifier.

## Log

- L1 (2026-11-03, user request): "Vamos a trabajar en las siguientes features: 1) Crear una cuenta para poder simular transferencias de dinero, 2) trabajar en la implementación de transferencias"
- L2 (2026-11-03, user): "Me refieron al segundo caso, para poder testear y mostrar en la prueba técnica" (a seeded recipient account, not a sign-up screen).
- L3 (2026-11-03, user): "No hay diseño, tendremos que implementarlo para sumar puntos en la prueba. Deberá haber un botón Transferir en el que te llevará a una pantalla con una lista de contactos con la posibilidad de añadir como favorito o la posibilidad de transferir a un nuevo usuario (por ahora hagamos esto)"
- L4 (2026-11-03): This replaces S11 of `odd/tasks/grana-bank-app.md` ("One account per user, single currency. No features beyond the brief"): the user confirmed new features. One account per user and single currency still hold.
- L5 (2026-11-03): T2 RED observed (missing modules), then 31 tests GREEN. Mutation check: removing `FOR UPDATE` fails the two concurrency tests. Full suite 86 tests, type check and lint pass.
- L6 (2026-11-03): Independent verifier on 98a16cd..fcbaeb5: no blockers; S1, S2, S3, S7, S9, S12 pass, S8 passes at service level. Probes: upgrade over baseline data keeps rows, 20 parallel drains, 40 opposite transfers, 10 duplicate keys. Advisories, all out of domain: sender without account throws, int4 overflow on the recipient throws and rolls back, a reused key with other values returns the first transfer.
- L7 (2026-11-03): Native assessment of db44268..fcbaeb5: high risk, review due (item 4 escalated). Review waits for the user's answer about where the access points go.
- L8 (2026-11-03, user): "Y qué me dices de agregar las siguientes opciones: pago de servicios, cargar tarjetas (aquí se podrán cargar tarjetas prepago de compañías de teléfono, de televisión satelital o cargar la tarjeta de transporte), no hace falta implementar todavía pero sí agregar los puntos de acceso, creo yo que en la barra inferior será un buen lugar para estos puntos de acceso"
- L9 (2026-11-03, user): "Puede haber un acceso rápido en el Home , se me ocurre debajo de la tarjeta y arriba de últimos movimientos en forma de cards y que vayan 4 accesos directos por fila"
- L10 (2026-11-03): T3 found that the new private routes were outside the proxy matcher; the existing "covers every private route" test went RED and is GREEN after adding them. Email normalization and validation moved from the login action to `features/auth/email.ts`, shared with the new-recipient lookup; login tests still pass. 99 tests, type check and lint pass.
- L11 (2026-11-03): Native review granted by the user for db44268..fcbaeb5 (lineage review-bdc40d73d16e11c8, lenses risk, resilience, reliability). The intended-untracked selection rejected every JSON shape tried, so T3 work was stashed while START froze and restored right after.
- L12 (2026-11-03): Native review approved and acknowledged (lineage review-bdc40d73d16e11c8, authority burned); reviewed boundary is fcbaeb5. Advisories accepted: a reused idempotency key with another amount or recipient now returns IDEMPOTENCY_MISMATCH (RED then GREEN), and the service limit has a test. Declined: per-account reference uniqueness (no code looks movements up by reference), cascade on user deletion (no deletion path; documented), untyped throw for a sender without account or a transaction timeout (the confirm action catches it and the key makes a retry safe).
- L13 (2026-11-03): T4 action tests RED (missing exports), then GREEN. Production build plus Chromium at 390 px against an isolated seeded database: 40 checks pass with no console errors, covering logged-out redirects, quick actions layout, Próximamente screens, favorite toggle persistence, every new-recipient and amount error, confirm, success, receipt reference, balances of both users, contact saved after the first transfer, and a double tap charging once.
- L14 (2026-11-03): Independent verifier on fcbaeb5..3e5b49d: no blockers, S1–S13 pass; login output byte-identical to baseline for 17 inputs. Advisory accepted as an S9 defect: Back from the success screen re-rendered the confirmation with a new key, so confirming again charged twice. Fixed by creating the key in the amount step and carrying it in the URL; a used key now redirects the confirmation to its receipt. Also accepted: keys are compared in lower case, and the confirm step says "Este destinatario ya no está disponible." instead of mentioning an email. Declined: no message when an out-of-range amount in the URL redirects to the amount screen (only reachable by editing the URL). 122 tests and 42 browser checks pass, including Back after success.
- L15 (2026-11-03, user): "Tengo que cambiar el remote por \"git remote add origin git@github.com:MauriMartinezz/grana-bank.git\"". `origin` already existed with the HTTPS URL of the same repository, so it was switched with `git remote set-url`.
- L16 (2026-11-03): Native review granted by the user and approved for fcbaeb5..90702e7 (lineage review-dddc51fce917b9e5, high risk, lenses risk, resilience, reliability), acknowledged and burned; reviewed boundary is 90702e7. Advisories accepted: the favorite toggle now reports a database failure instead of throwing, and the confirmation URL guards moved to `features/transfers/confirmation.ts` with tests (one shared key check). Declined: email enumeration through the recipient lookup, already documented as a decision and a known limitation (no rate limiting). 137 tests pass.
