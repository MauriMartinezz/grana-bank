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

## Tasks

- [ ] T1 (S1, S2, S3, S12) inline: schema (Contact, transfer link), migration, seed.
- [ ] T2 (S7, S8, S9, S12) inline: transfer service and amount parsing, with tests.
- [ ] T3 (S4, S5, S11) inline: Transferir button and contacts screen with favorites.
- [ ] T4 (S6, S8, S10) inline: new recipient, amount, confirmation and success screens.
- [ ] T5 (S2, S3) inline: README demo credentials and flow.

Route evidence: no writer reason applies. T3 and T4 depend on T1 and T2, so all tasks run inline. Risk: item 1 (migration) and item 4 (concurrent balance updates) apply to T1 and T2, so they get an independent verifier.

## Log

- L1 (2026-11-03, user request): "Vamos a trabajar en las siguientes features: 1) Crear una cuenta para poder simular transferencias de dinero, 2) trabajar en la implementación de transferencias"
- L2 (2026-11-03, user): "Me refieron al segundo caso, para poder testear y mostrar en la prueba técnica" (a seeded recipient account, not a sign-up screen).
- L3 (2026-11-03, user): "No hay diseño, tendremos que implementarlo para sumar puntos en la prueba. Deberá haber un botón Transferir en el que te llevará a una pantalla con una lista de contactos con la posibilidad de añadir como favorito o la posibilidad de transferir a un nuevo usuario (por ahora hagamos esto)"
- L4 (2026-11-03): This replaces S11 of `odd/tasks/grana-bank-app.md` ("One account per user, single currency. No features beyond the brief"): the user confirmed new features. One account per user and single currency still hold.
