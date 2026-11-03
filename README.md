# GranaBank

Aplicación web de home banking, pensada primero para celular, hecha para un desafío técnico. Un usuario inicia sesión y maneja una cuenta por moneda (pesos y, opcionalmente, dólares): transferencias, compra y venta de dólares, tarjetas, recargas, pago de servicios con programación, categorías, ingresos desde una cuenta de prueba, suscripciones, promociones y notificaciones. Todo corre localmente contra una base PostgreSQL en Docker; no se contacta a ningún banco, red de tarjetas ni empresa real.

## Documentación

| Documento | Para qué leerlo |
|-----------|-----------------|
| [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md) | Ver cada funcionalidad, cuáles son demo, las diferencias con Figma y las limitaciones conocidas |
| [docs/DEMO.md](docs/DEMO.md) | Iniciar sesión con los usuarios de prueba, saber a quién se le puede enviar dinero y recorrer cada flujo |
| [docs/DECISIONES.md](docs/DECISIONES.md) | Entender las decisiones técnicas: centavos y `BIGINT`, Next.js, Server Actions, bloqueos, idempotencia, seguridad |

## Contenido

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Herramientas de IA y flujo de trabajo](#herramientas-de-ia-y-flujo-de-trabajo)
- [Requisitos](#requisitos)
- [Levantarlo localmente](#levantarlo-localmente)
- [Comandos](#comandos)
- [Probarlo](#probarlo)
- [Estructura del proyecto](#estructura-del-proyecto)

## Funcionalidades

| Área | Qué puede hacer el usuario |
|------|----------------------------|
| Ingreso | Email y contraseña, "Recordarme", cerrar sesión desde Perfil |
| Inicio | Saldo por cuenta (el ojo lo oculta como `*****`), tarjetas en carrusel, accesos rápidos, próximos vencimientos, promos de hoy, últimos movimientos |
| Movimientos | Búsqueda, filtros rápidos y por fechas, detalle con categoría y nota |
| Transferir | Por alias o email, con contactos, favoritos, nota y categoría |
| Ingresar dinero | Desde la "Cuenta de prueba"; también programar ingresos (demo) |
| Dólares | Compra y venta a una cotización simulada |
| Tarjetas | Visa, Mastercard o American Express validadas localmente, con tarjeta predeterminada por cuenta |
| Recargas | SUBE, celular (Personal, Movistar, Claro, Tuenti) y DirecTV; recarga programada de SUBE (demo) |
| Servicios | Adhesión por empresa, pago en pesos o dólares, pago programado, débito automático y recordatorios |
| Suscripciones | Listar, cambiar la tarjeta, dar de baja y suscribirse desde un catálogo (demo) |
| Promociones | Descuentos de comercios inventados filtrados por día y categoría |
| Notificaciones | La campana lista dinero que entra y sale, operaciones con dólares, pagos fallidos y recordatorios |
| Perfil | Datos personales, email, alias, contraseña, moneda preferida, categorías, suscripciones, tema y vista (escritorio o celular) |

El detalle completo está en [docs/FUNCIONALIDADES.md](docs/FUNCIONALIDADES.md).

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Server Actions, Cache Components, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Lenguaje | TypeScript 5 |
| Base de datos | PostgreSQL 17 (imagen de Docker `postgres:17-alpine`) |
| ORM | Prisma 7 con el adaptador del driver `pg` |
| Tests | Vitest 5, contra la base real |
| Lint | ESLint 9 con `eslint-config-next` |
| Gestor de paquetes | pnpm (versión fijada en `package.json` → `packageManager`) |

No hay servicios externos, pasarelas de pago ni proveedores de autenticación: las contraseñas usan scrypt de `node:crypto` y las sesiones viven en la base.

## Herramientas de IA y flujo de trabajo

El proyecto se construyó con un agente de IA dirigido por una persona. La persona define qué se hace, aprueba las decisiones de producto y decide cada entrega; el agente explora, escribe código y tests, y documenta.

| Herramienta | Qué aporta |
|-------------|------------|
| [Claude Code](https://claude.com/claude-code) | Agente de programación en la terminal, con modelos Claude de Anthropic. Lee y edita el código, corre tests y comandos, y lanza subagentes |
| Subagentes | Escritores en paralelo sobre archivos distintos y verificadores independientes que prueban cada cambio de riesgo (dinero, seguridad, migraciones) contra la base real |
| [Engram](https://github.com/Gentleman-Programming/engram) | Memoria persistente vía MCP: guarda decisiones, descubrimientos y resúmenes de sesión, para retomar el trabajo entre sesiones |
| [gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) | Configura al agente: el flujo de trabajo ODD, la revisión nativa por recibos (RDD) con lentes de riesgo, confiabilidad, resiliencia y legibilidad, y el registro de skills (`.atl/skill-registry.md`) |
| Context7 (MCP) | Documentación actualizada de librerías, disponible para el agente |
| `AGENTS.md` | Reglas que Next.js 16 genera para agentes: esta versión tiene cambios incompatibles, y su documentación local está en `node_modules/next/dist/docs/` |

**Flujo ODD (Organic Driven Development).** Cada pedido pasa por: autorizar, explorar el código, resolver dudas con una sola pregunta, clasificar el tamaño y, si es grande, crear un documento en `odd/tasks/` antes de escribir código. Ese documento tiene los requisitos con las palabras textuales del pedido, las tareas y una bitácora. Después se implementa con tests primero (se ve el test fallar y luego pasar), en commits chicos con mensajes Conventional Commits. Los cambios que tocan dinero, seguridad o migraciones pasan por un verificador independiente y, si la persona acepta, por la revisión nativa.

## Requisitos

Instalá esto antes de empezar:

| Herramienta | Versión | Para qué | Cómo verificarlo |
|-------------|---------|----------|------------------|
| [Node.js](https://nodejs.org) | 22 o más nueva | Corre Next.js, Prisma y los tests | `node -v` |
| [pnpm](https://pnpm.io) | la de `packageManager` (Corepack la elige) | Instala dependencias y corre los scripts | `pnpm -v` |
| [Docker](https://docs.docker.com/get-docker/) con Compose v2 | Docker Desktop, o Docker Engine con el plugin Compose | Corre PostgreSQL | `docker compose version` |
| Git | cualquiera | Clona el repositorio | `git --version` |

Los puertos **3000** (la app) y **5433** (PostgreSQL) tienen que estar libres. También necesitás la contraseña del usuario principal que figura en la consigna del desafío: el seed la lee de `SEED_USER_PASSWORD` y nunca se guarda en el repositorio.

Corepack viene con Node.js; si falta `pnpm`, corré `corepack enable` una vez.

## Levantarlo localmente

```bash
# 1. Obtener el código
git clone git@github.com:MauriMartinezz/grana-bank.git
cd grana-bank

# 2. Configurar el entorno (los valores por defecto sirven para la base de Docker)
cp .env.example .env

# 3. Instalar dependencias
pnpm install

# 4. Levantar PostgreSQL en Docker y esperar a que esté listo (puerto 5433)
pnpm db:up

# 5. Crear las tablas y generar el cliente de Prisma
pnpm db:migrate

# 6. Cargar los datos de demo: usuarios, cuentas, tarjetas, servicios, promociones
SEED_USER_PASSWORD='<contraseña de la consigna>' pnpm db:seed

# 7. Levantar la app
pnpm dev
```

Abrí http://localhost:3000, mejor en una vista de celular (herramientas del navegador → modo dispositivo) o elegí **Perfil → Vista → Escritorio**, e iniciá sesión como `soygranate@clublanus.com` con la contraseña de la consigna.

Después de traer cambios que tocan `prisma/`, corré `pnpm db:migrate` y reiniciá `pnpm dev`: un servidor en marcha mantiene el cliente de Prisma que cargó al iniciar.

### Variables de entorno

| Variable | Obligatoria | Valor en `.env.example` | Para qué |
|----------|-------------|-------------------------|----------|
| `DATABASE_URL` | Sí | `postgresql://grana:grana@localhost:5433/grana_bank` | La base de Docker de `docker-compose.yml` |
| `SEED_USER_PASSWORD` | Solo para `pnpm db:seed` | no está: se pasa en el comando | Contraseña de todos los usuarios del seed |
| `CRON_SECRET` | No | no está: agregala en `.env` | Secreto Bearer de `/api/pagos-agendados`; sin él, el endpoint rechaza todo |

### Pagos programados

Los pagos programados y los débitos automáticos de servicios se ejecutan cuando algo llama a `/api/pagos-agendados` (`GET` o `POST`) con `Authorization: Bearer $CRON_SECRET`, por ejemplo un cron diario. Para probarlo localmente, definí `CRON_SECRET` en `.env` (por ejemplo con `openssl rand -hex 32`), reiniciá `pnpm dev` y llamá:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/pagos-agendados
# {"paid":N,"failed":N}
```

Sin secreto, el botón **Procesar pagos agendados**, al final de Servicios, ejecuta los pagos de hoy del usuario que inició sesión.

## Comandos

| Comando | Qué hace |
|---------|----------|
| `pnpm dev` | Servidor de desarrollo en http://localhost:3000 |
| `pnpm test` | Tests unitarios y de integración; la base tiene que estar levantada |
| `pnpm lint` | ESLint |
| `pnpm build` | Genera el cliente de Prisma y compila para producción |
| `pnpm start` | Sirve la versión compilada |
| `pnpm db:up` | Levanta PostgreSQL en Docker |
| `pnpm db:migrate` | Aplica las migraciones pendientes y regenera el cliente de Prisma |
| `pnpm db:seed` | Reinicia los usuarios de demo y las promociones (necesita `SEED_USER_PASSWORD`) |
| `pnpm db:promos` | Carga solo las promociones de demo, sin tocar los usuarios |
| `docker compose down` | Detiene PostgreSQL y conserva sus datos |
| `docker compose down -v` | Detiene PostgreSQL y borra sus datos; después hay que correr `db:up`, `db:migrate` y `db:seed` |

## Probarlo

Iniciá sesión como `soygranate@clublanus.com` con la contraseña de la consigna. El seed también crea a Juan Perez (`juan.perez`, `juan.perez.usd`) y a Martin Bozzini (`martin.bozzini`) para recibir transferencias, y la "Cuenta de prueba" que alimenta **Ingresar dinero**. [docs/DEMO.md](docs/DEMO.md) lista cada usuario, cuenta, tarjeta y saldo, a quién se le puede enviar dinero y un recorrido paso a paso por cada flujo.

## Estructura del proyecto

```text
app/         Rutas, layouts y estados de carga y error
  (app)/     Pantallas que requieren sesión
  (auth)/    Pantalla de ingreso
  api/       Route handlers (el cron de pagos programados)
features/    Código agrupado por dominio: account, auth, cards, categories, deposits, exchange,
             movements, notifications, profile, promotions, services, subscriptions, top-ups, transfers
components/  UI compartida sin conocimiento del dominio
lib/         Cliente de base de datos y formateadores
prisma/      Schema, migraciones y seed
docs/        Funcionalidades, guía de demo y decisiones técnicas
odd/tasks/   Documentos de cada funcionalidad: requisitos, tareas y bitácora
proxy.ts     Redirige al ingreso a quien no tiene cookie de sesión
```
