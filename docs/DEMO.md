# Demo guide

Everything you need to sign in and try GranaBank after `pnpm db:seed`. Running the seed again resets these users, their data and the promotions.

## Sign in

All seeded users share one password: the one you passed as `SEED_USER_PASSWORD` (the challenge brief's password). Open http://localhost:3000 and sign in as the main user:

**`soygranate@clublanus.com`**

## Users

| User | Email | Accounts (alias · starting balance) | Cards | Role in the demo |
|------|-------|-------------------------------------|-------|------------------|
| Soy Granate | `soygranate@clublanus.com` | `soy.granate` · $2.500.000<br>`soy.granate.usd` · USD$250 | Mastercard •••• 1234 (pesos)<br>Visa •••• 5678 (dollars) | Main user: movements, a contact, a SUBE card, a service, subscriptions |
| Juan Perez | `juanperez@clublanus.com` | `juan.perez` · $250<br>`juan.perez.usd` · USD$0 | Visa •••• 4821 (pesos) | Already a contact of Granate; receives dollar transfers |
| Martin Bozzini | `martinbozzini@clublanus.com` | `martin.bozzini` · $180 | Visa •••• 7390 (pesos) | Not a contact: shows the "Nuevo destinatario" flow |
| Cuenta de prueba | `cuenta.prueba@granabank.test` | `cuenta.prueba` · $10.000 millones<br>`cuenta.prueba.usd` · USD$10.000 millones | none | Funds **Ingresar dinero**. It cannot sign in and cannot receive transfers |

## Where you can send money

| To | How | Currency |
|----|-----|----------|
| Juan Perez | Transferir → his contact card, or alias `juan.perez` | Pesos |
| Juan Perez | Alias `juan.perez.usd` | Dollars (from Granate's dollar account) |
| Martin Bozzini | Transferir → **Nuevo destinatario** → alias `martin.bozzini`, or **Transferir por email** with his email | Pesos only |
| Cuenta de prueba | Not allowed: it is never found as a recipient | — |

A transfer only goes between accounts of the same currency. Each one is capped at $1.000.000 (or USD$1.000.000).

## What Granate starts with

| Area | Seeded data |
|------|-------------|
| Movimientos | Payments received and sent, plus subscription charges from Adobe, Figma, Spotify and Netflix |
| Contactos | Juan Perez (pesos) |
| Recargas | SUBE card "sube de mauri", `6061 2345 6789 0123` |
| Servicios | Edesur "Luz depto", payment number `0012345678`, last month's and this month's bills, a 3-day reminder |
| Suscripciones | Adobe, Figma, Spotify and Netflix, active (a demo: nothing charges them) |
| Categorías | Alquiler, Comida, Servicios, Regalos, Otros |
| Promociones | 12 promotions of invented merchants, in force this month and the next |

## Try these flows

1. **A transfer from both sides.** As Granate: Transferir → Nuevo destinatario → `martin.bozzini`, an amount, a note and a category → Confirmar. Sign out, sign in as Martin Bozzini: the balance and a "Pago recibido" with the note are there, and the bell shows it.
2. **Dollars.** Dólares → Comprar: debits pesos at 1 USD = $1.500 and credits dollars. Then transfer dollars to `juan.perez.usd`.
3. **Add money.** Ingresar (first quick action on Home) → up to $1.000.000 or USD 10.000 at a time from the Cuenta de prueba. **Programar ingresos** saves a weekly or monthly deposit (demo).
4. **Pay a service.** Servicios → Luz depto opens the payment of its next bill. Try **Programar el pago** for a day before the due date, or **Débito automático** on the service, then **Procesar pagos agendados** at the bottom of Servicios.
5. **Adhere a service.** Servicios → Adherir servicio → pick a company. Number lengths: AySA 10, Edesur 10, Edenor 12, Metrogas 11, Salud Plena 8 and Austral Seguros 9 digits (the last two bill in dollars and are paid from the dollar account).
6. **Top-ups.** Recargas → SUBE, Telefonía (pick the company, then a number such as `11 1234 5678`) or DirecTV (8 to 12 digits). $100 to $50.000 each.
7. **Cards.** Tarjetas → Agregar tarjeta. Test numbers that pass validation: Visa `4111 1111 1111 1111`, Mastercard `5555 5555 5555 4444`, American Express `3782 822463 10005`, any future expiry and a 3-digit CVV (4 for Amex).
8. **Privacy.** The eye on the Home balance card hides every balance as `*****` on this device.
9. **Notifications.** The bell on Home lists money in and out, dollar operations, failed scheduled payments and service reminders.

## Reset

```bash
SEED_USER_PASSWORD='<password from the brief>' pnpm db:seed
```

It deletes and recreates the four users above (matched by email and alias) and reloads the promotions. Other users you created are left as they are.
