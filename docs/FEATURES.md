# Features

What GranaBank does, screen by screen. For test users and step-by-step flows see [DEMO.md](DEMO.md); for the reasons behind the implementation see [DECISIONS.md](DECISIONS.md).

Features marked **demo** are saved and shown, but never move money.

## Accounts and Home

| Feature | What it does |
|---------|--------------|
| Sign in | Email and password, "Recordarme" (7-day session, otherwise one browser session), logout from Perfil |
| Accounts | One account per currency: pesos by default, dollars optional. Each has its balance, alias and cards |
| Home | Account switcher, balance card, quick actions, upcoming bills, "Promos de hoy", latest 6 movements |
| Hidden balance | The eye on the balance card swaps every balance in the app for `*****`, per device |
| Quick actions | Ingresar, Transferir, Servicios, Recargas, Tarjetas, Dólares |
| Notificaciones | The bell lists the last 30 days: money received and sent, top-ups, service and subscription payments, dollar buys and sells, failed scheduled payments and service reminders, with an unread count |

## Movements

| Feature | What it does |
|---------|--------------|
| Movimientos | Search by name, quick filters (Suscripción, Recibido, Enviado), a date range, grouped by day |
| Detail | Type, card, date, operation number, note, and the category, which the owner can change |

## Moving money

| Feature | What it does |
|---------|--------------|
| Transferir | By alias or email, with contacts and favorites; optional note (seen by both sides) and category (private); confirmation and receipt |
| Ingresar dinero | Adds up to $1.000.000 or USD 10.000 at a time from the seeded "Cuenta de prueba" |
| Programar ingresos | **Demo.** A weekly or monthly deposit on a chosen day |
| Dólares | Buy and sell at a fixed 1 USD = $1.500, choosing the cards on each side |

## Payments

| Feature | What it does |
|---------|--------------|
| Recargas | SUBE (saved cards with a nickname), phone (pick Personal, Movistar, Claro or Tuenti, then the number) and DirecTV; $100 to $50.000, paid with a peso card |
| Recarga programada | **Demo.** A weekly or monthly SUBE top-up |
| Servicios | Adhere a company from its card (AySA, Edesur, Edenor, Metrogas in pesos; Salud Plena and Austral Seguros in dollars) with the electronic payment number; a service opens the payment of its next bill |
| Pago programado | A one-off payment on a day up to the due date |
| Débito automático | Pays every bill of a service on its due date with a chosen card |
| Recordatorios | Per service: the same day, 1, 3 or 7 days before the due date, shown in Notificaciones |
| Suscripciones | **Demo.** List, detail, change card, cancel, and subscribe from a catalog of invented services |

## Organizing

| Feature | What it does |
|---------|--------------|
| Categorías | Per-user categories (five defaults), editable in Perfil; set from the transfer flow or any movement's detail; service payments go to Servicios |
| Notes | An optional note of up to 140 characters on transfers, top-ups and service payments |
| Promociones | Invented merchants' discounts with their cap ("20% hasta $15.000"), filtered by weekday and category; informative only |

## Perfil

| Feature | What it does |
|---------|--------------|
| Personal data, email, password | One screen per change; email and password need the current password, and a new password closes the other sessions |
| Aliases | Change each account's alias |
| Preferred currency | The account Home shows first |
| Categorías | Add, rename and delete |
| Tema | Light or dark, per device |
| Vista | Automática, Escritorio or Móvil, per device |
| Tarjetas | Add Visa, Mastercard or American Express (validated locally); open a card to see its movements |

## Differences from the Figma design

- **Colors:** sampled from PNG exports, so they are close approximations.
- **"Subscripción":** corrected to "Suscripción", matching "Pago de suscripción" in the same design.
- **Bell:** the brief gives it no behavior; it opens Notificaciones, with the unread count.
- **Logo:** cropped from a PNG export. Replace `public/logo.png` with the original vector.


## Known limitations

- **Contrast:** the yellow amount is hard to read on white. It is kept to follow the design, and the icon and subtitle also convey the movement type.
- **Search:** it ignores case but not accents, so "Jose" does not find "José".
- **List size:** the movement list shows the 50 most recent items, without pagination.
- **Password attempts:** there is no rate limiting on login or on the Perfil changes that ask for the current password, which a real banking app would need.
- **Transfers:** there is no daily limit or second factor, only a limit of 1,000,000 per transfer. Deleting a user also deletes their transfers; no screen deletes users.
- **Top-ups:** simulated: no provider is contacted, a SUBE load still has to be validated at a terminal or in the SUBE app, and phone numbers are not checked against the company. A 4-digit area code is shown grouped 3-3-4, because telling area code lengths apart needs the full numbering plan.
- **Services:** simulated: no company is contacted. Adhering a service creates two pending bills, for the previous and the current month in Buenos Aires time, whose amount (whole pesos from $8.000 to $60.000, or USD 40 to 250 for the dollar companies) and due day (10 to 20) come from a SHA-256 hash of the company, the number and the month, so the same number always gets the same bills. No new bills appear later, and a due bill can still be paid.
- **Exchange rate:** fixed at 1 USD = $1.500 for both buying and selling; there is no spread or live quote.
- **New dollar account:** it starts without a card, so the user adds one in Tarjetas before exchanging.
- **Theme:** the choice is stored in the browser, so it does not follow the user to another device.
- **Native review:** the accounts feature is too large for one native review candidate, so it is verified independently and reviewed in smaller slices (see `odd/tasks/accounts.md`).
