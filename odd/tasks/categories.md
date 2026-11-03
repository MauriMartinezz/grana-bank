# Notes and categories

Objective: transfers (and later top-ups and service payments) carry an optional note and a per-user category, so a later screen can summarize spending by category.
Branch: `feat/accounts` (after the accounts feature). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "Las transferencias, recargas y pagos de servicios podrán tener comentarios o notas además de categorías". Recargas and Servicios are still "Próximamente" (the user said earlier "no hace falta implementar todavía"), so notes and categories apply to transfers now and the model is ready for the other two.
- S2. "por defecto sugerir un par pero que el usuario pueda modificarlas o crear nuevas". Assumption: every user starts with Alquiler, Comida, Servicios, Regalos and Otros; a Categorías screen in Perfil renames, deletes and creates categories. Names are unique per user, ignoring case.
- S3. "esto se usará para ver un resumen por categoría más adelante". Not built now; categories live on movements so the summary can group them.
- S4. Assumptions: the note is the transfer concept, visible to sender and recipient, at most 140 characters; the category is private to the owner of each movement and can be changed later from the movement detail, also on received movements. Deleting a category leaves its movements uncategorized.

## Tasks

- [ ] T1 (S1, S2, S4) schema: Category model, movement category, transfer note, migration and default categories.
- [ ] T2 (S1, S4) transfer flow: note and category in the amount step, shown on confirmation, success and detail.
- [ ] T3 (S2) Categorías screen in Perfil.
- [ ] T4 (S4) change the category from the movement detail.

Route evidence: starts after the accounts feature's T9 lands, because T9 edits the same transfer screens.

## Log

- L1 (2026-11-03, user request): "Las transferencias, recargas y pagos de servicios podrán tener comentarios o notas además de categorías (por defecto sugerir un par pero que el usuario pueda modificarlas o crear nuevas, esto se usará para ver un resumen por categoría más adelante)"
