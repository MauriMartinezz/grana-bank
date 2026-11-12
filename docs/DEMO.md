# Guía de demo

Todo lo necesario para iniciar sesión y probar Vuelto después de `pnpm db:seed`. Volver a correr el seed reinicia estos usuarios, sus datos y las promociones.

## Iniciar sesión

Todos los usuarios del seed comparten una contraseña: la que pasaste en `SEED_USER_PASSWORD`. Abrí http://localhost:3000 e iniciá sesión con el usuario principal:

**`lucia.fernandez@vuelto.test`**

## Usuarios

| Usuario | Email | Cuentas (alias · saldo inicial) | Tarjetas | Rol en la demo |
|---------|-------|---------------------------------|----------|----------------|
| Lucía Fernández | `lucia.fernandez@vuelto.test` | `lucia.fernandez` · $2.500.000<br>`lucia.fernandez.usd` · USD$250 | Mastercard •••• 1234 (pesos)<br>Visa •••• 5678 (dólares) | Usuario principal: movimientos, un contacto, una tarjeta SUBE, un servicio, suscripciones |
| Juan Perez | `juanperez@vuelto.test` | `juan.perez` · $250<br>`juan.perez.usd` · USD$0 | Visa •••• 4821 (pesos) | Ya es contacto de Lucía; recibe transferencias en dólares |
| Martín Gómez | `martingomez@vuelto.test` | `martin.gomez` · $180 | Visa •••• 7390 (pesos) | No es contacto: muestra el flujo de "Nuevo destinatario" |
| Cuenta de prueba | `cuenta.prueba@vuelto.test` | `cuenta.prueba` · $10.000 millones<br>`cuenta.prueba.usd` · USD$10.000 millones | ninguna | Alimenta **Ingresar dinero**. No puede iniciar sesión ni recibir transferencias |

## A quién se le puede enviar dinero

| A quién | Cómo | Moneda |
|---------|------|--------|
| Juan Perez | Transferir → su tarjeta de contacto, o alias `juan.perez` | Pesos |
| Juan Perez | Alias `juan.perez.usd` | Dólares (desde la cuenta en dólares de Lucía) |
| Martín Gómez | Transferir → **Nuevo destinatario** → alias `martin.gomez`, o **Transferir por email** con su email | Solo pesos |
| Cuenta de prueba | No se permite: nunca aparece como destinatario | — |

Una transferencia solo va entre cuentas de la misma moneda. Cada una tiene un tope de $1.000.000 (o USD$1.000.000).

## Con qué empieza Lucía

| Área | Datos del seed |
|------|----------------|
| Movimientos | Pagos recibidos y enviados, más cobros de suscripciones de Adobe, Figma, Spotify y Netflix |
| Contactos | Juan Perez (pesos) |
| Recargas | Tarjeta SUBE "sube de mauri", `6061 2345 6789 0123` |
| Servicios | Edesur "Luz depto", número de pago `0012345678`, las facturas del mes pasado y de este mes, un recordatorio 3 días antes |
| Suscripciones | Adobe, Figma, Spotify y Netflix, activas (es una demo: nada las cobra) |
| Categorías | Alquiler, Comida, Servicios, Regalos, Otros |
| Promociones | 12 promociones de comercios inventados, vigentes este mes y el próximo |

## Recorridos para probar

1. **Una transferencia desde los dos lados.** Como Lucía: Transferir → Nuevo destinatario → `martin.gomez`, un monto, una nota y una categoría → Confirmar. Cerrá sesión e iniciá sesión como Martín Gómez: ahí están el saldo y un "Pago recibido" con la nota, y la campana lo muestra.
2. **Dólares.** Dólares → Comprar: debita pesos a 1 USD = $1.500 y acredita dólares. Después transferí dólares a `juan.perez.usd`.
3. **Ingresar dinero.** Ingresar (primer acceso rápido de Inicio) → hasta $1.000.000 o USD 10.000 por vez desde la Cuenta de prueba. **Programar ingresos** guarda un ingreso semanal o mensual (demo).
4. **Pagar un servicio.** Servicios → Luz depto abre el pago de su próxima factura, con una nota opcional. Probá **Programar el pago** para un día antes del vencimiento, o **Débito automático** en el servicio, y después **Procesar pagos agendados** al final de Servicios.
5. **Adherir un servicio.** Servicios → Adherir servicio → elegí una empresa. Largo de los números: AySA 10, Edesur 10, Edenor 12, Metrogas 11, Salud Plena 8 y Austral Seguros 9 dígitos (las dos últimas facturan en dólares y se pagan desde la cuenta en dólares).
6. **Recargas.** Recargas → SUBE, Telefonía (elegí la empresa y después un número como `11 1234 5678`) o DirecTV (8 a 12 dígitos). De $100 a $50.000 cada una, con una nota opcional.
7. **Tarjetas.** Tarjetas → Agregar tarjeta. Números de prueba que pasan la validación: Visa `4111 1111 1111 1111`, Mastercard `5555 5555 5555 4444`, American Express `3782 822463 10005`, cualquier vencimiento futuro y un CVV de 3 dígitos (4 para Amex).
8. **Varias tarjetas y la predeterminada.** Agregá una segunda tarjeta a la cuenta en pesos. En Inicio, el saldo aparece una vez ("2 tarjetas usan este saldo") y las tarjetas siguen en un carrusel. Tocá la nueva para abrir su página y elegí **Usar como predeterminada para pagar en pesos**: pasa a ser la primera del carrusel, Tarjetas la marca como "Predeterminada" y aparece preseleccionada al pagar.
9. **Suscripciones.** Perfil → Suscripciones: abrí una para ver el detalle, cambiale la tarjeta o dala de baja, y suscribite a otra desde el catálogo (demo: nada se cobra).
10. **Privacidad.** El ojo de la tarjeta de saldo de Inicio oculta todos los saldos de la app como `*****` en este dispositivo.
11. **Notificaciones.** La campana de Inicio lista el dinero que entra y sale, las operaciones con dólares, los pagos programados fallidos y los recordatorios de servicios.

## Reiniciar

```bash
SEED_USER_PASSWORD='<una contraseña a elección>' pnpm db:seed
```

Borra y vuelve a crear los cuatro usuarios de arriba (los identifica por email y alias) y recarga las promociones. Los demás usuarios que hayas creado quedan como están.
