# Funcionalidades

Qué hace Vuelto, pantalla por pantalla. Para los usuarios de prueba y los recorridos paso a paso, mirá [DEMO.md](DEMO.md); para los motivos detrás de la implementación, [DECISIONES.md](DECISIONES.md).

Las funcionalidades marcadas como **demo** se guardan y se muestran, pero nunca mueven dinero.

## Cuentas e Inicio

| Funcionalidad | Qué hace |
|---------------|----------|
| Ingreso | Email y contraseña, "Recordarme" (sesión de 7 días; si no, dura lo que la sesión del navegador), cerrar sesión desde Perfil |
| Cuentas | Una cuenta por moneda: pesos por defecto y dólares opcional. Cada una tiene su saldo, su alias y sus tarjetas, que comparten ese saldo |
| Inicio | Selector de cuenta, tarjeta de saldo, accesos rápidos, próximos vencimientos, "Promos de hoy" y los últimos 6 movimientos |
| Tarjeta de saldo | Con una sola tarjeta, es la tarjeta del diseño. Con varias, el saldo se muestra una vez ("N tarjetas usan este saldo") y las tarjetas siguen en un carrusel, primero la predeterminada. Tocar una tarjeta abre su página |
| Saldo oculto | El ojo de la tarjeta de saldo reemplaza por `*****` todos los saldos de la app, no solo el de Inicio; se guarda por dispositivo |
| Accesos rápidos | Ingresar, Transferir, Servicios, Recargas, Tarjetas, Dólares |
| Notificaciones | La campana lista los últimos 30 días: dinero recibido y enviado, recargas, pagos de servicios y suscripciones, compras y ventas de dólares, pagos programados fallidos y recordatorios de servicios, con la cantidad sin leer |

## Tarjetas

| Funcionalidad | Qué hace |
|---------------|----------|
| Tarjetas | Agregar Visa, Mastercard o American Express (validadas localmente) a la cuenta en pesos o en dólares; abrir una tarjeta para ver sus movimientos |
| Tarjeta predeterminada | Una por cuenta: la que elige el usuario o, si no eligió, la más antigua. Aparece primera y preseleccionada en cada selector de pago, y una transferencia enviada la registra. Se elige desde la página de la tarjeta (**Usar como predeterminada para pagar en pesos**) y Tarjetas la marca como "Predeterminada" |

## Movimientos

| Funcionalidad | Qué hace |
|---------------|----------|
| Movimientos | Búsqueda por nombre, filtros rápidos (Suscripción, Recibido, Enviado) y rango de fechas, agrupados por día |
| Detalle | Tipo, tarjeta, fecha, número de operación, nota y la categoría, que el dueño puede cambiar |

## Mover dinero

| Funcionalidad | Qué hace |
|---------------|----------|
| Transferir | Por alias o email, con contactos y favoritos; nota opcional (la ven ambas partes) y categoría (privada); confirmación y comprobante |
| Ingresar dinero | Suma hasta $1.000.000 o USD 10.000 por vez desde la "Cuenta de prueba" del seed |
| Programar ingresos | **Demo.** Un ingreso semanal o mensual en el día elegido |
| Dólares | Compra y venta a un valor fijo de 1 USD = $1.500, eligiendo la tarjeta de cada lado |

## Pagos

| Funcionalidad | Qué hace |
|---------------|----------|
| Recargas | SUBE (tarjetas guardadas con un apodo), celular (elegir Personal, Movistar, Claro o Tuenti y después el número) y DirecTV; de $100 a $50.000, pagadas con una tarjeta en pesos |
| Recarga programada | **Demo.** Una recarga de SUBE semanal o mensual |
| Servicios | Adherir una empresa desde su tarjeta (AySA, Edesur, Edenor y Metrogas en pesos; Salud Plena y Austral Seguros en dólares) con el número de pago electrónico; un servicio abre el pago de su próxima factura |
| Pago programado | Un pago único en un día hasta el vencimiento |
| Débito automático | Paga cada factura de un servicio en su vencimiento con la tarjeta elegida |
| Recordatorios | Por servicio: el mismo día, o 1, 3 o 7 días antes del vencimiento; se muestran en Notificaciones |
| Suscripciones | **Demo.** Lista, detalle, cambiar la tarjeta, dar de baja y suscribirse desde un catálogo de servicios inventados |

## Organización

| Funcionalidad | Qué hace |
|---------------|----------|
| Categorías | Categorías por usuario (cinco por defecto), editables en Perfil; se eligen en el flujo de transferencia o en el detalle de cualquier movimiento; los pagos de servicios van a Servicios |
| Notas | Una nota opcional de hasta 140 caracteres en transferencias, recargas y pagos de servicios |
| Promociones | Descuentos de comercios inventados con su tope ("20% hasta $15.000") o "sin límite", la compra mínima cuando la hay ("Compra mínima $30.000") y el banco cuando lo hay, agrupados por día de la semana (lunes a domingo; una promoción válida varios días aparece en cada uno) y filtrables por día, categoría y tarjeta (`?tarjeta=visa`: esa marca más las que aplican a todas las tarjetas); solo informativos |
| Administración de promociones | Solo para el usuario administrador (`/admin/promociones`, adonde lo lleva el inicio de sesión): crea promociones con banco (opcional), emisora (Visa, Mastercard, American Express o todas las tarjetas), nombre, categoría, días, porcentaje (1 a 100), límite de descuento o "Sin límite", compra mínima o "Sin mínimo", vigencia y descripción, y lista todas las promociones. El servidor valida el rol en la página y en la acción: un usuario común recibe "Página no encontrada" |

## Perfil

| Funcionalidad | Qué hace |
|---------------|----------|
| Datos personales, email, contraseña | Una pantalla por cambio; el email y la contraseña piden la contraseña actual, y una contraseña nueva cierra las otras sesiones |
| Alias | Cambiar el alias de cada cuenta |
| Moneda preferida | La cuenta que Inicio muestra primero |
| Categorías | Agregar, renombrar y borrar |
| Suscripciones | Acceso a la lista de suscripciones, con la cantidad de activas |
| Tema | Claro u oscuro, por dispositivo |
| Vista | Automática, Escritorio o Móvil, por dispositivo |

## Diferencias con el diseño de Figma

| Tema | Diferencia |
|------|------------|
| Colores | Tomados de exportaciones PNG, así que son aproximaciones cercanas |
| "Subscripción" | Corregido a "Suscripción", igual que "Pago de suscripción" en el mismo diseño |
| Campana | Abre Notificaciones, con la cantidad sin leer |
| Varias tarjetas | El diseño muestra una sola tarjeta. Con varias, el saldo aparece una vez y las tarjetas siguen en un carrusel |
| Logo | Recortado de una exportación PNG. Reemplazá `public/logo.png` por el vector original |

## Limitaciones conocidas

| Tema | Limitación |
|------|------------|
| Contraste | El monto amarillo se lee mal sobre blanco. Se mantiene para respetar el diseño, y el ícono y el subtítulo también indican el tipo de movimiento |
| Búsqueda | Ignora mayúsculas pero no acentos, así que "Jose" no encuentra "José" |
| Tamaño de la lista | La lista de movimientos muestra los 50 más recientes, sin paginación |
| Intentos de contraseña | No hay límite de intentos en el ingreso ni en los cambios de Perfil que piden la contraseña actual, algo que una app bancaria real necesitaría |
| Transferencias | No hay límite diario ni segundo factor, solo un tope de 1.000.000 por transferencia. Borrar un usuario también borra sus transferencias; ninguna pantalla borra usuarios |
| Recargas | Simuladas: no se contacta a ningún proveedor, una carga de SUBE igual tiene que validarse en una terminal o en la app de SUBE, y los números de celular no se verifican con la empresa. Un código de área de 4 dígitos se muestra agrupado 3-3-4, porque distinguir el largo de los códigos de área requiere el plan de numeración completo |
| Servicios | Simulados: no se contacta a ninguna empresa. Adherir un servicio crea dos facturas pendientes, del mes anterior y del actual en hora de Buenos Aires, cuyo monto (pesos enteros de $8.000 a $60.000, o USD 40 a 250 para las empresas en dólares) y día de vencimiento (10 a 20) salen de un hash SHA-256 de la empresa, el número y el mes, así que el mismo número siempre recibe las mismas facturas. Después no aparecen facturas nuevas, y una factura vencida igual se puede pagar |
| Cotización | Fija en 1 USD = $1.500 para compra y venta; no hay diferencia entre compra y venta ni cotización en vivo |
| Cuenta en dólares nueva | Empieza sin tarjeta, así que el usuario agrega una en Tarjetas antes de operar con dólares |
| Tema y saldo oculto | La elección se guarda en el navegador, así que no acompaña al usuario a otro dispositivo |
| Revisión nativa | La funcionalidad de cuentas es demasiado grande para un solo candidato de revisión nativa, así que se verifica de forma independiente y se revisa en partes más chicas (ver `odd/tasks/accounts.md`) |
