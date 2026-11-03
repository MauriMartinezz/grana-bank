# Notes and categories

Objective: transfers (and later top-ups and service payments) carry an optional note and a per-user category, so a later screen can summarize spending by category.
Branch: `feat/accounts` (after the accounts feature). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "Las transferencias, recargas y pagos de servicios podrán tener comentarios o notas además de categorías". Recargas and Servicios exist now (odd/tasks/top-ups.md, odd/tasks/services.md). Categories live on every movement, so a top-up or a service payment gets one from the movement detail (T4). The note is typed in the transfer flow; notes in the top-up and service flows are T5, pending the user's go-ahead.
- S2. "por defecto sugerir un par pero que el usuario pueda modificarlas o crear nuevas". Assumption: every user starts with Alquiler, Comida, Servicios, Regalos and Otros; a Categorías screen in Perfil renames, deletes and creates categories. Names are unique per user, ignoring case.
- S3. "esto se usará para ver un resumen por categoría más adelante". Not built now; categories live on movements so the summary can group them.
- S4. Assumptions: the note is the transfer concept, visible to sender and recipient, at most 140 characters; the category is private to the owner of each movement and can be changed later from the movement detail, also on received movements. Deleting a category leaves its movements uncategorized.

## Tasks

- [x] T1 (S1, S2, S4) schema: Category model (unique normalized name per user), movement category, transfer note, migration that gives existing users the defaults, seed. Route: inline. Risk: item 1. Commit 45d4624.
- [x] T2 (S1, S4) transfer flow: note and category in the amount step, shown on confirmation, success and detail. Route: inline. Commit 4d3d478.
- [x] T3 (S2) Categorías screen in Perfil. Route: inline. Commit e63d251 (shares features/categories/actions.ts with T4).
- [x] T4 (S4) change the category from the movement detail, for every movement type. Route: inline. Commit e63d251.
- [ ] T5 (S1) notes in the top-up and service payment flows. Pending the user's go-ahead.

Route evidence: accounts T9 landed (2525ab3). T2, T3 and T4 have disjoint surfaces, but they run inline one after another: the machine ran out of memory today, and parallel writers each run Vitest and tsc.

## Log

- L1 (2026-11-03, user request): "Las transferencias, recargas y pagos de servicios podrán tener comentarios o notas además de categorías (por defecto sugerir un par pero que el usuario pueda modificarlas o crear nuevas, esto se usará para ver un resumen por categoría más adelante)"
- L2 (2026-11-03, user): "Bien, continúa con categorías".
- L3 (2026-11-03): T1-T4 done; RED observed before the category service, the transfer note and category, and the actions. vitest 808/808, tsc and eslint clean. Migration 20261104030000_categories gives every existing user the five defaults. The note and the category are not compared on an idempotent replay, like `saveContact`. Not checked in a browser. Independent verifier: S1-S4 pass, no blockers; differential check of reviewAmount, readConfirmation and confirmTransfer against 757c6d4 identical. Fixed one advisory (a submitted textarea sends line breaks as CRLF, which counted twice against the 140 limit; the note now normalizes them to \n), RED observed first. Remaining advisories: a name of only zero-width characters is accepted; a confirmation URL rebuilt for a missing key drops the note and category; a category deleted during a write shows the generic retry error. Native review declined by the user for this candidate (757c6d4..6e697a9).
