# Recordatorios y notificaciones

Objective: service reminders the user configures, and the Home bell listing notifications for reminders, money received and failed operations.
Branch: `feat/accounts` (after Promociones). Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "En servicios, se podrá agregar la opción de recordatorios, ahí podrás elegir si querés que te envíen una notificación y con cuánto tiempo de anticipación (ejemplo el mismo día, 7 días antes, 3 días antes, etc) Y eso diparará las notificaciones de la campanita, lo mismo cuando recibís dinero o cuando falla una transacción o cuando recibís dinero".
- S2. "Tendrás que crear la última pantalla, la de notificaciones, la cual se accede con el ícono de campana, el cual mostrará los movimiento que ya hablamos y los recordatorios que hayas configurado (que te recuerden cuándo va a vencer un servicio, cuando se rechazo un pago, cuando recibís dinero, cuando se envió dinero, cuando se compró o vendió dólares,etc)".

## Tasks

- [x] T1 (S1, S2) model and feed: `ServiceAdhesion.reminderDays`, `User.notificationsSeenAt`, the feed builder and its query. Route: inline. Risk: items 1 (new columns) and 2 (the feed must only read the user's data). Commit 087af88.
- [x] T2 (S1) reminder setting on the service screen. Route: inline. Commit eb1df27.
- [x] T3 (S2) `/notificaciones` screen, bell link with the unread count, mark as seen. Route: inline.

Assumptions (S1, S2): notifications are derived from stored data, never written by the money flows: movements of the last 30 days (received, sent, top-up, service payment, subscription charge), dollar buys and sells (one per exchange), failed scheduled payments, and bill reminders; a reminder is set per service (off, the same day, 1, 3 or 7 days before) and shows from that day until the due date while the bill is pending; the newest 50 are listed, newest first; the bell shows how many arrived after the user last opened the screen, which marks them seen; the scheduled deposits and top-ups are demos that never run, so they notify nothing.

## Log

- L1 (2026-11-03, user request): "En servicios, se podrá agregar la opción de recordatorios, ahí podrás elegir si querés que te envíen una notificación y con cuánto tiempo de anticipación (ejemplo el mismo día, 7 días antes, 3 días antes, etc) Y eso diparará las notificaciones de la campanita, lo mismo cuando recibís dinero o cuando falla una transacción o cuando recibís dinero"
- L2 (2026-11-03, user request, from Recargas): "notificar cuando se hace un movimiento así" (a scheduled top-up).
- L3 (2026-11-03, user request): see S2. Next after scheduled top-ups (ccd0373), before Suscripciones and the desktop view.
- L4 (2026-11-03): T1-T3 done; RED observed for the feed, the queries and the reminder action. A first migration failed in the dev database (the schema edit did not apply, so its CHECK named a missing column); it was marked rolled back and redone, nothing was applied. vitest 886/886, tsc and eslint clean. The seed starts Luz depto with a 3-day reminder. Not checked in a browser.
- L5 (2026-11-03): Independent verifier: S1, S2 pass, no blockers; deposits S3 and the scheduled top-ups pass; the enum rename keeps existing rows and CHECKs on a throwaway database. Fixed: deleting a scheduled top-up twice at once threw (now deleteMany). Advisories left: a failure notice disappears once the bill is paid; marking seen uses the action's time; a reminder's time follows the current setting; the bell builds the whole feed on each Home render.
