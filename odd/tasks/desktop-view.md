# Vista desktop

Objective: a desktop layout for the browser and a Perfil option to switch between the desktop and the mobile view.
Branch: `feat/accounts`. Delivery strategy: `single-pr`. Test runner: Vitest.

## Specs

- S1. "Hay que trabajar con una vista desktop para el navegador y que en Perfil haya una opción para switchear entre vista de desktop y vista mobile".

## Tasks

- [x] T1 (S1) desktop layout and the Perfil switch between desktop and mobile view. Route: delegated (parallel writer). Evidence: RED/GREEN in L3; commit pending (parent owns git).

  Assumptions: the switch offers three choices, "Automática" (default: desktop from the `lg` breakpoint, 64rem), "Escritorio" and "Móvil", stored per device in localStorage (`grana-view`) like the theme. Desktop means a centered frame of up to 1200px with a left sidebar holding the bottom bar's destinations and a centered page column of up to `max-w-2xl`; the bottom bar is hidden. Only the signed-in app widens: the login screen keeps its 430px column in every view. Mobile stays exactly as before.

## Log

- L1 (2026-11-03, user request): "Hay que trabajar con una vista desktop para el navegador y que en Perfil haya una opción para switchear entre vista de desktop y vista mobile"
- L2 (2026-11-03, user): "puedes asignar varios agentes a trabajar en las distintas cosas que están pendientes?"
- L3 (2026-11-03, T1 writer): built `features/profile/view.ts` (VIEWS, `grana-view` key, `parseView`, `viewInitScript` setting `data-view` on <html> before paint), `features/profile/view-toggle.tsx` (`ViewToggle` button group with aria-pressed, `ViewSync`), a `desktop:` custom variant in `app/globals.css` (`data-view="desktop"`, or width >= 64rem unless `data-view="mobile"`), `components/layout/side-nav.tsx` plus shared `components/layout/nav-links.ts`, BottomNav hidden with `desktop:hidden`, the (app) layout grid (sidebar + `max-w-2xl` main), the root frame widening to 1200px only when it holds the app shell (`has-[[data-shell=app]]`), the third head script in `app/layout.tsx`, and the "Vista" row under "Tema" in Perfil. RED: `npx vitest run features/profile/view.test.ts` failed (module `./view` missing, no tests). GREEN: 8/8 passed. Checks: `npx vitest run features/profile` 85/85 passed; `npx tsc --noEmit` errors only in `features/services/notes.test.ts` and `features/top-ups/notes.test.ts` (other writers' in-progress work), none in T1 files; eslint on the T1 surfaces clean. Compiled the variant with Tailwind 4.3.3: it emits `:root[data-view="desktop"] .x` and `@media (width >= 64rem) { :root:not([data-view="mobile"]) .x }`, which outrank the base utilities. Not checked without a browser: the visual result, the Vista row fitting at 430px, and no flash on load.
