# Decisiones técnicas

Por qué Vuelto está hecho como está. Cada sección dice primero la decisión y después el motivo.

## Dinero

### Centavos enteros, nunca punto flotante

Todo monto se guarda y se calcula como un número entero de centavos: `$1.500,50` es `150050`.

Los números de punto flotante son fracciones binarias: `0.1 + 0.2` da `0.30000000000000004`. Un saldo que suma y resta esos valores se desvía por fracciones de centavo, y compararlo con un monto (`balance >= amount`) puede dar una respuesta equivocada. Los enteros son exactos, así que un saldo siempre es la suma de sus movimientos.

### `BIGINT` en la base y `bigint` en TypeScript

Los saldos y los montos son columnas `BIGINT`, que Prisma lee como `bigint` de JavaScript.

Un `INTEGER` de 32 bits llega hasta 2.147.483.647 centavos, unos $21 millones, y un saldo puede superarlo. Un `number` de JavaScript es exacto solo hasta 2^53, y mezclarlo con cuentas de dinero invita a redondeos silenciosos. `bigint` mantiene exacta cada operación a cualquier tamaño, y TypeScript no deja mezclarlo con `number` por accidente. Los montos escritos se convierten a centavos con funciones chicas y testeadas (`parseAmountToCents`), y una transferencia tiene un tope de 1.000.000, así que los valores de los formularios siguen siendo enteros seguros hasta convertirse en `bigint`.

### Un único formato argentino para leer y escribir

`$5.000` para pesos y `USD$12,50` para dólares; los campos aceptan `1.500,50` y rechazan `12.5`. El punto nunca es separador decimal, así que nadie escribe 12,50 y obtiene 125.

## Cuentas y tarjetas

### El saldo es de la cuenta; las tarjetas son formas de usarlo

Cada usuario tiene una cuenta por moneda, y cada cuenta tiene un saldo, un alias y sus tarjetas. Todas las tarjetas de una cuenta comparten ese saldo.

Es una decisión de producto elegida a propósito: como en un banco, el saldo pertenece a la cuenta y las tarjetas son formas de usarlo. Por eso, con varias tarjetas, Inicio muestra el saldo una sola vez ("N tarjetas usan este saldo") y las tarjetas siguen en un carrusel, en lugar de repetir el mismo saldo en cada una.

### Una tarjeta predeterminada por cuenta

La cuenta guarda la tarjeta elegida (`tarjeta_predeterminada_id`, con `ON DELETE SET NULL`). Si no hay ninguna elegida, o la elegida se borró, la predeterminada es la más antigua. Una única función pura (`features/cards/default-card.ts`) resuelve esa regla, así que los selectores de pago, el carrusel de Inicio y las transferencias coinciden siempre: la predeterminada aparece primera y preseleccionada, y cada lado de una transferencia registra la de su cuenta.

## Framework

### Next.js con el App Router

Next.js renderiza en el servidor, algo que le sirve a un banco: los saldos y los movimientos se leen junto a la base, nunca a través de una API JSON pública, y el navegador recibe solo HTML y el poco JavaScript que necesita cada interacción. Las rutas basadas en archivos le dan una URL a cada pantalla, así que el botón de volver, las recargas de página y los enlaces compartidos funcionan, y `loading.tsx`, `error.tsx` y `not-found.tsx` le dan a cada ruta sus estados de carga, error y vacío sin trabajo extra.

### Server Actions para cada cambio

Los formularios envían a Server Actions en lugar de rutas de API escritas a mano. Corren en el servidor con la sesión del usuario, el formulario funciona antes de que cargue JavaScript y no hay un esquema de pedido y respuesta que mantener sincronizado entre cliente y servidor. Cada acción vuelve a validar su entrada, más allá de lo que ya revisó el formulario, porque una Server Action es un endpoint público. El único Route Handler es `/api/pagos-agendados`, al que llama un cron sin sesión.

### Cache Components y Suspense

Las partes estáticas de una pantalla se renderizan al instante y los datos llegan después detrás de límites de Suspense con esqueletos. Por eso también las preferencias por dispositivo (tema, saldo oculto, vista) viven en `localStorage` y las aplican scripts mínimos en `<head>`: leer una cookie en el layout raíz haría dinámica a cada página.

### PostgreSQL y Prisma

PostgreSQL da transacciones reales, bloqueos de filas (`SELECT … FOR UPDATE`) y restricciones `CHECK`, en las que se apoyan los flujos de dinero. Prisma da consultas tipadas y migraciones versionadas; el SQL crudo se usa solo para los bloqueos de filas.

### Nombres de la base en español, código en inglés

Las tablas, columnas y restricciones están en snake_case en español (`cuentas.saldo_centavos`), mapeadas con `@map`/`@@map`; los identificadores del código quedan en inglés. La base se lee en el idioma del producto y el código mantiene un solo idioma.

## Corrección de los flujos de dinero

### Una transacción con bloqueos de filas

Las transferencias, las operaciones con dólares, las recargas, los pagos de servicios y los ingresos corren en una transacción de base que bloquea las filas de las cuentas afectadas con `SELECT … FOR UPDATE`, siempre en el mismo orden (por id). Las operaciones concurrentes sobre la misma cuenta se esperan entre sí, así que la verificación de saldo siempre ve el saldo más reciente y dos usuarios que se envían dinero mutuamente no pueden bloquearse. Las restricciones `CHECK` mantienen los saldos no negativos aunque el código tuviera un error.

### Claves de idempotencia

La pantalla de confirmación recibe una clave aleatoria en su URL, y la operación la guarda con un índice único. Un doble toque, un reintento después de un error de red o el botón de volver repiten la misma clave y obtienen el primer resultado: nada se cobra dos veces. La misma clave con otro monto u otro destinatario se rechaza.

### Los pagos programados también son idempotentes

Un pago de servicio programado o automático usa una clave por factura, así que dos ejecuciones superpuestas del cron pagan una factura una sola vez, y bajo el bloqueo de la factura verifica que siga programada con esa tarjeta. Un pago sin saldo termina como fallido y no se reintenta hasta que el usuario actúa, así que nunca cobra por sorpresa más tarde.

## Seguridad

| Decisión | Por qué |
|----------|---------|
| Contraseñas con hash scrypt con sal de `node:crypto` | Resiste la fuerza bruta y no agrega dependencias |
| Un token de sesión aleatorio en una cookie `httpOnly`, guardado como hash SHA-256 | Cerrar sesión revoca la sesión al instante, y una filtración de la base no expone ningún token usable |
| `proxy.ts` revisa la cookie; `getCurrentUser()` valida la sesión | El proxy evita renderizar pantallas privadas a visitantes sin consultar la base; las pantallas y las consultas nunca leen cookies por su cuenta |
| Cada consulta filtra por el dueño (`account.userId`) | Un usuario no puede leer otra cuenta adivinando un id |
| Las tarjetas guardan solo marca, últimos cuatro dígitos, titular y vencimiento | El número completo y el CVV nunca llegan a la base ni a los logs |
| La cuenta de prueba está marcada con `isTestAccount` | No puede iniciar sesión, aparecer como destinataria ni recibir dinero |

## Forma del producto

| Decisión | Por qué |
|----------|---------|
| Las notificaciones se derivan de los datos guardados | Ningún flujo de dinero escribe una notificación, así que ninguna puede perderse ni duplicarse |
| Las funcionalidades demo (ingresos y recargas programados, suscripciones) guardan y listan, nunca cobran | El usuario las pidió como demos; cobrar de verdad necesita los mismos bloqueos e idempotencia que los pagos programados de servicios |
| Empresas, facturas y cotizaciones simuladas | No se contacta a ninguna empresa, red de tarjetas ni casa de cambio reales; las empresas que facturan en dólares son inventadas |
| Saldo oculto en toda la app | Un único componente (`features/account/balance.tsx`) muestra cada saldo, así que el ojo de Inicio oculta todos, no solo el de la tarjeta de saldo |
| Filtros y búsqueda en la URL | Sobreviven a una recarga y a la vuelta desde un detalle |
| Sin librería de validación | Los montos, alias, tarjetas y fechas se interpretan con funciones chicas y testeadas |

## Tests

Vitest corre tests unitarios para las reglas puras y tests de integración contra la base PostgreSQL real, porque los bloqueos, los índices únicos y las restricciones `CHECK` son parte del comportamiento y un mock los escondería. La concurrencia se prueba disparando muchos pedidos a la vez y verificando que el dinero se mueva exactamente una vez.

## Tabla de referencia

| Tema | Decisión | Por qué |
|------|----------|---------|
| Dinero | Centavos enteros | El punto flotante no puede representar centavos con exactitud. |
| Nombres de la base | Tablas, columnas, tipos enum y restricciones en snake_case en español (`usuarios`, `cuentas.saldo_centavos`, `moneda`), mapeados con `@@map`/`@map` de Prisma; los identificadores del código y los valores de los enums quedan en inglés | La base se lee en el idioma del producto y el código mantiene un solo idioma. El SQL crudo (los bloqueos de filas) usa los nombres en español. |
| Usuario actual | Una única función `getCurrentUser()` | Las pantallas y las consultas nunca leen cookies ni sesiones por su cuenta. |
| Contraseñas | scrypt con sal de `node:crypto` | Resiste la fuerza bruta y no agrega dependencias. |
| Sesiones | Token aleatorio en una cookie `httpOnly`, guardado como hash SHA-256 en la base | Cerrar sesión revoca la sesión al instante, y una filtración de la base no expone ningún token usable. |
| Protección de rutas | `proxy.ts` revisa la cookie, `getCurrentUser()` valida la sesión | El proxy evita renderizar pantallas privadas a visitantes anónimos, sin consultar la base en cada pedido. |
| "Recordarme" | Cookie persistente de 7 días; si no, una cookie de sesión del navegador que vence en el servidor después de 1 día | Respeta la casilla del diseño con un valor por defecto corto para una app bancaria. |
| Acceso a datos | Cada consulta filtra por `account.userId` | Un usuario no puede leer otra cuenta adivinando un id. |
| Búsqueda y filtros | Guardados en la URL | Sobreviven a una recarga y a la vuelta desde la página de detalle. |
| Carga | Límites de Suspense con esqueletos | El layout de la pantalla aparece al instante y los datos llegan después. |
| Pantalla de detalle | Página en `/movimientos/[id]` | Tiene URL y estados naturales de carga y de no encontrado. |
| Librerías de validación | Ninguna | Los filtros y los montos se interpretan con funciones chicas y testeadas. |
| Transferencias | Una transacción de base que bloquea ambas cuentas con `SELECT … FOR UPDATE` en orden de id | Las transferencias concurrentes no pueden dejar una cuenta en negativo, y dos usuarios que se envían dinero mutuamente no pueden bloquearse. Las restricciones `CHECK` de la base mantienen los saldos no negativos aunque el código tenga un error. |
| Doble envío | Una clave de idempotencia generada cuando se renderiza la pantalla de confirmación | Repetir el pedido devuelve la primera transferencia, así que un reintento nunca cobra dos veces. La misma clave con otro monto u otro destinatario se rechaza. |
| Referencia de transferencia | Secuencial `TRF-000001`, compartida por ambas partes | Quien envía y quien recibe ven el mismo número de operación, como en un comprobante bancario. |
| Contactos | Se guardan solo cuando quien envía marca `Guardar a <nombre> en mis contactos` en la pantalla de confirmación; los favoritos aparecen primero | La lista crece con el uso real sin llenarse de destinatarios ocasionales, y la elección está en el paso que quien envía ya revisa. |
| Búsqueda de destinatario | Por alias por defecto, por email detrás de un botón | Un alias es fácil de compartir y oculta el email. Los alias tienen de 1 a 40 caracteres (letras sin acento, dígitos y puntos, con al menos una letra) e ignoran mayúsculas: se guardan en minúscula, son únicos y una `CHECK` de la base los vuelve a verificar. La búsqueda indica si un alias o email tiene cuenta, como las transferencias bancarias muestran el nombre del destinatario. |
| Accesos rápidos | Ingresar, Transferir, Servicios, Recargas, Tarjetas y Dólares en Inicio, Ingresar primero | Un toque hasta las operaciones más comunes; en la demo, Ingresar alimenta todas las demás. |
| Servicios | Adherir AySA, Edesur, Edenor o Metrogas con el número de pago electrónico y un apodo; pagar una factura pendiente con una tarjeta de la moneda de la factura, en una transacción que bloquea la cuenta y después la factura, con clave de idempotencia; referencia `SV-000001` | Las mismas garantías que las transferencias, y una factura se paga una sola vez: el bloqueo serializa los pagos concurrentes y un índice único sobre la factura del pago lo respalda. Los largos de los números son simulados (AySA 10, Edesur 10, Edenor 12, Metrogas 11, Salud Plena 8, Austral Seguros 9 dígitos) y una `CHECK` de la base los vuelve a verificar. |
| Pagos programados | Un pago único en el día elegido, o un débito automático en el vencimiento, que ejecuta a diario `/api/pagos-agendados` (Bearer `CRON_SECRET`) o el botón de la demo | Cada ejecución paga con el mismo pago bloqueado e idempotente, con una clave por factura, así que las ejecuciones superpuestas pagan una factura una sola vez; bajo el bloqueo de la factura, el pago verifica que siga programada con esa tarjeta, así que una cancelación nunca pierde contra una ejecución. Un pago sin saldo o sin tarjeta termina como fallido con un aviso y no se reintenta hasta que el usuario vuelve a programarlo o cambia el débito automático, así que nunca deja la cuenta en negativo ni cobra por sorpresa más tarde. |
| Categorías | Categorías por usuario en los movimientos, únicas por nombre sin distinguir mayúsculas mediante una columna `key` en minúscula | La categoría vive en cada movimiento, así que queda privada para ese lado y un resumen futuro puede agrupar los movimientos por ella. Borrar una categoría deja sus movimientos sin categoría (`ON DELETE SET NULL`). Cada escritura verifica que tanto el movimiento como la categoría pertenezcan al usuario. |
| Notas | Una nota opcional de 1 a 140 caracteres en transferencias, recargas y pagos de servicios | Una `CHECK` de la base vuelve a verificar el largo. La nota de una transferencia la ven ambas partes. |
| Ingresos | Un usuario del sistema creado por el seed, marcado con `isTestAccount`, le envía al usuario una transferencia común | Reutilizar la transferencia les da a los ingresos los mismos bloqueos, clave de idempotencia y movimientos. La marca deja a la cuenta de prueba fuera del ingreso, de la búsqueda de destinatarios y de las transferencias entrantes. |
| Notificaciones | Derivadas de los movimientos, operaciones con dólares, pagos fallidos y recordatorios guardados; un `notificationsSeenAt` por usuario da la cantidad sin leer | Ningún flujo de dinero escribe una notificación, así que ninguna puede perderse ni duplicarse, y el listado siempre coincide con los datos. |
| Recargas | SUBE (tarjetas guardadas con un apodo), celular (Personal, Movistar, Claro, Tuenti) y DirecTV, de $100 a $50.000 cada una, pagadas con una tarjeta en pesos en una transacción que bloquea la cuenta, con clave de idempotencia; referencia `RC-000001` | Las mismas garantías que las transferencias. Un número de SUBE tiene 16 dígitos y empieza con 6061 (una `CHECK` de la base lo vuelve a verificar). Un número de celular se guarda como su número nacional de 10 dígitos: se aceptan y se quitan el `+54`, el `9` de celulares, el `0` de larga distancia y el `15` histórico después del código de área; los números `11` se leen `+54 11 1234 5678` y el resto `+54 351 123 4567`. Las cuentas de DirecTV tienen de 8 a 12 dígitos y los comprobantes muestran solo los últimos cuatro. |
| Cuentas | Una cuenta por usuario y moneda (ARS por defecto, USD opcional), cada una con su saldo, su alias y sus tarjetas | Como en un banco, el saldo pertenece a la cuenta y las tarjetas son formas de usarlo, así que todas las tarjetas de una cuenta comparten su saldo. Las transferencias solo van entre cuentas de la misma moneda. |
| Tarjeta predeterminada | Una por cuenta: la elegida desde la página de la tarjeta o, si no hay, la más antigua; se resuelve con una función pura | Aparece primera y preseleccionada en cada selector de pago y en el carrusel de Inicio, y cada lado de una transferencia la registra. Si la tarjeta elegida se borra, la columna queda en `NULL` y vuelve a valer la más antigua. |
| Inicio con varias tarjetas | Con una tarjeta, la tarjeta del diseño; con varias, el saldo una vez y las tarjetas en un carrusel con desplazamiento por CSS, primero la predeterminada | Las tarjetas comparten el saldo, así que repetirlo en cada una sugeriría saldos separados. El carrusel no necesita JavaScript. |
| Formato de dinero | Argentino en todos lados: `$5.000` para pesos, `USD$12,50` para dólares; los campos aceptan `1.500,50` y rechazan `12.5` | Un único formato para leer y escribir evita interpretar el punto como separador decimal. |
| Compra y venta de dólares | Cotización simulada fija de 1 USD = $1.500 en una transacción que bloquea ambas cuentas, con clave de idempotencia | Las mismas garantías que las transferencias: sin saldo negativo, sin bloqueo mutuo, sin doble cobro. |
| Tarjetas | Visa, Mastercard y American Express validadas localmente (prefijo, largo, Luhn, vencimiento, largo del CVV); se guardan solo marca, últimos cuatro dígitos, titular y vencimiento | Muestra cómo el producto valida sin una API externa, y el número completo y el CVV nunca llegan a la base ni a los logs. Las restricciones `CHECK` de la base rechazan un número completo. |
| Perfil | Un resumen con una pantalla por cambio; cambiar el email o la contraseña pide la contraseña actual, y una contraseña nueva cierra las otras sesiones | Para editar el identificador de ingreso o la contraseña hay que demostrar que se es el dueño. |
| Saldo oculto | El ojo de la tarjeta de saldo reemplaza todos los saldos de la app por `*****`, por dispositivo, aplicado antes del primer pintado como el tema | El monto nunca aparece un instante en pantalla antes de ocultarse, algo que importa para la privacidad en público. |
| Tema | Claro u oscuro por dispositivo, aplicado antes del primer pintado | Leer una cookie en el layout raíz haría dinámica a cada página con Cache Components. |
