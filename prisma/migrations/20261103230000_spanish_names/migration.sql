-- Database names move to Spanish; the code keeps its English identifiers
-- through @map/@@map in schema.prisma. Every statement is a rename: no row,
-- default, constraint or index is dropped or rebuilt, and no data moves.
-- Postgres tracks columns, types and sequences by OID, so CHECK bodies,
-- column defaults ('ARS'::moneda, nextval of the number sequences) and
-- foreign keys follow the renames by themselves.
-- Enum values (ARS, USD, SENT, ...) are data and stay as they are.

-- Enum types.
ALTER TYPE "MovementType" RENAME TO "tipo_movimiento";
ALTER TYPE "CardBrand" RENAME TO "marca_tarjeta";
ALTER TYPE "Currency" RENAME TO "moneda";
ALTER TYPE "ExchangeDirection" RENAME TO "direccion_cambio";

-- usuarios
ALTER TABLE "User" RENAME TO "usuarios";
ALTER TABLE "usuarios" RENAME COLUMN "firstName" TO "nombre";
ALTER TABLE "usuarios" RENAME COLUMN "lastName" TO "apellido";
ALTER TABLE "usuarios" RENAME COLUMN "address" TO "direccion";
ALTER TABLE "usuarios" RENAME COLUMN "phone" TO "telefono";
ALTER TABLE "usuarios" RENAME COLUMN "preferredCurrency" TO "moneda_preferida";
ALTER TABLE "usuarios" RENAME COLUMN "passwordHash" TO "hash_contrasena";
ALTER TABLE "usuarios" RENAME CONSTRAINT "User_pkey" TO "usuarios_pkey";
ALTER INDEX "User_email_key" RENAME TO "usuarios_email_key";

-- contactos
ALTER TABLE "Contact" RENAME TO "contactos";
ALTER TABLE "contactos" RENAME COLUMN "ownerId" TO "propietario_id";
ALTER TABLE "contactos" RENAME COLUMN "contactAccountId" TO "cuenta_contacto_id";
ALTER TABLE "contactos" RENAME COLUMN "favorite" TO "favorito";
ALTER TABLE "contactos" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "contactos" RENAME CONSTRAINT "Contact_pkey" TO "contactos_pkey";
ALTER TABLE "contactos" RENAME CONSTRAINT "Contact_ownerId_fkey" TO "contactos_propietario_id_fkey";
ALTER TABLE "contactos" RENAME CONSTRAINT "Contact_contactAccountId_fkey" TO "contactos_cuenta_contacto_id_fkey";
ALTER INDEX "Contact_ownerId_contactAccountId_key" RENAME TO "contactos_propietario_id_cuenta_contacto_id_key";

-- sesiones
ALTER TABLE "Session" RENAME TO "sesiones";
ALTER TABLE "sesiones" RENAME COLUMN "tokenHash" TO "hash_token";
ALTER TABLE "sesiones" RENAME COLUMN "userId" TO "usuario_id";
ALTER TABLE "sesiones" RENAME COLUMN "expiresAt" TO "vence_en";
ALTER TABLE "sesiones" RENAME CONSTRAINT "Session_pkey" TO "sesiones_pkey";
ALTER TABLE "sesiones" RENAME CONSTRAINT "Session_userId_fkey" TO "sesiones_usuario_id_fkey";
ALTER INDEX "Session_tokenHash_key" RENAME TO "sesiones_hash_token_key";
ALTER INDEX "Session_userId_idx" RENAME TO "sesiones_usuario_id_idx";

-- cuentas
ALTER TABLE "Account" RENAME TO "cuentas";
ALTER TABLE "cuentas" RENAME COLUMN "userId" TO "usuario_id";
ALTER TABLE "cuentas" RENAME COLUMN "currency" TO "moneda";
ALTER TABLE "cuentas" RENAME COLUMN "balanceCents" TO "saldo_centavos";
ALTER TABLE "cuentas" RENAME CONSTRAINT "Account_pkey" TO "cuentas_pkey";
ALTER TABLE "cuentas" RENAME CONSTRAINT "Account_userId_fkey" TO "cuentas_usuario_id_fkey";
ALTER TABLE "cuentas" RENAME CONSTRAINT "Account_alias_format" TO "cuentas_alias_formato";
ALTER TABLE "cuentas" RENAME CONSTRAINT "Account_balanceCents_non_negative" TO "cuentas_saldo_no_negativo";
ALTER INDEX "Account_alias_key" RENAME TO "cuentas_alias_key";
ALTER INDEX "Account_userId_currency_key" RENAME TO "cuentas_usuario_id_moneda_key";

-- tarjetas
ALTER TABLE "Card" RENAME TO "tarjetas";
ALTER TABLE "tarjetas" RENAME COLUMN "accountId" TO "cuenta_id";
ALTER TABLE "tarjetas" RENAME COLUMN "brand" TO "marca";
ALTER TABLE "tarjetas" RENAME COLUMN "last4" TO "ultimos_4";
ALTER TABLE "tarjetas" RENAME COLUMN "holder" TO "titular";
ALTER TABLE "tarjetas" RENAME COLUMN "expiry" TO "vencimiento";
ALTER TABLE "tarjetas" RENAME COLUMN "createdAt" TO "creado_en";
ALTER TABLE "tarjetas" RENAME CONSTRAINT "Card_pkey" TO "tarjetas_pkey";
ALTER TABLE "tarjetas" RENAME CONSTRAINT "Card_accountId_fkey" TO "tarjetas_cuenta_id_fkey";
ALTER TABLE "tarjetas" RENAME CONSTRAINT "Card_last4_format" TO "tarjetas_ultimos_4_formato";
ALTER TABLE "tarjetas" RENAME CONSTRAINT "Card_expiry_format" TO "tarjetas_vencimiento_formato";
ALTER INDEX "Card_accountId_idx" RENAME TO "tarjetas_cuenta_id_idx";

-- transferencias
ALTER TABLE "Transfer" RENAME TO "transferencias";
ALTER TABLE "transferencias" RENAME COLUMN "number" TO "numero";
ALTER TABLE "transferencias" RENAME COLUMN "fromAccountId" TO "cuenta_origen_id";
ALTER TABLE "transferencias" RENAME COLUMN "toAccountId" TO "cuenta_destino_id";
ALTER TABLE "transferencias" RENAME COLUMN "amountCents" TO "monto_centavos";
ALTER TABLE "transferencias" RENAME COLUMN "idempotencyKey" TO "clave_idempotencia";
ALTER TABLE "transferencias" RENAME COLUMN "createdAt" TO "creado_en";
ALTER SEQUENCE "Transfer_number_seq" RENAME TO "transferencias_numero_seq";
ALTER TABLE "transferencias" RENAME CONSTRAINT "Transfer_pkey" TO "transferencias_pkey";
ALTER TABLE "transferencias" RENAME CONSTRAINT "Transfer_fromAccountId_fkey" TO "transferencias_cuenta_origen_id_fkey";
ALTER TABLE "transferencias" RENAME CONSTRAINT "Transfer_toAccountId_fkey" TO "transferencias_cuenta_destino_id_fkey";
ALTER TABLE "transferencias" RENAME CONSTRAINT "Transfer_amountCents_positive" TO "transferencias_monto_positivo";
ALTER TABLE "transferencias" RENAME CONSTRAINT "Transfer_distinct_accounts" TO "transferencias_cuentas_distintas";
ALTER INDEX "Transfer_number_key" RENAME TO "transferencias_numero_key";
ALTER INDEX "Transfer_fromAccountId_idempotencyKey_key" RENAME TO "transferencias_cuenta_origen_id_clave_idempotencia_key";

-- operaciones_cambio
ALTER TABLE "Exchange" RENAME TO "operaciones_cambio";
ALTER TABLE "operaciones_cambio" RENAME COLUMN "number" TO "numero";
ALTER TABLE "operaciones_cambio" RENAME COLUMN "userId" TO "usuario_id";
ALTER TABLE "operaciones_cambio" RENAME COLUMN "direction" TO "direccion";
ALTER TABLE "operaciones_cambio" RENAME COLUMN "usdCents" TO "centavos_usd";
ALTER TABLE "operaciones_cambio" RENAME COLUMN "arsCents" TO "centavos_ars";
ALTER TABLE "operaciones_cambio" RENAME COLUMN "rateArsPerUsd" TO "cotizacion_ars_por_usd";
ALTER TABLE "operaciones_cambio" RENAME COLUMN "fromAccountId" TO "cuenta_origen_id";
ALTER TABLE "operaciones_cambio" RENAME COLUMN "toAccountId" TO "cuenta_destino_id";
ALTER TABLE "operaciones_cambio" RENAME COLUMN "idempotencyKey" TO "clave_idempotencia";
ALTER TABLE "operaciones_cambio" RENAME COLUMN "createdAt" TO "creado_en";
ALTER SEQUENCE "Exchange_number_seq" RENAME TO "operaciones_cambio_numero_seq";
ALTER TABLE "operaciones_cambio" RENAME CONSTRAINT "Exchange_pkey" TO "operaciones_cambio_pkey";
ALTER TABLE "operaciones_cambio" RENAME CONSTRAINT "Exchange_userId_fkey" TO "operaciones_cambio_usuario_id_fkey";
ALTER TABLE "operaciones_cambio" RENAME CONSTRAINT "Exchange_fromAccountId_fkey" TO "operaciones_cambio_cuenta_origen_id_fkey";
ALTER TABLE "operaciones_cambio" RENAME CONSTRAINT "Exchange_toAccountId_fkey" TO "operaciones_cambio_cuenta_destino_id_fkey";
ALTER TABLE "operaciones_cambio" RENAME CONSTRAINT "Exchange_amounts_positive" TO "operaciones_cambio_montos_positivos";
ALTER TABLE "operaciones_cambio" RENAME CONSTRAINT "Exchange_distinct_accounts" TO "operaciones_cambio_cuentas_distintas";
ALTER INDEX "Exchange_number_key" RENAME TO "operaciones_cambio_numero_key";
ALTER INDEX "Exchange_userId_idempotencyKey_key" RENAME TO "operaciones_cambio_usuario_id_clave_idempotencia_key";

-- movimientos
ALTER TABLE "Movement" RENAME TO "movimientos";
ALTER TABLE "movimientos" RENAME COLUMN "accountId" TO "cuenta_id";
ALTER TABLE "movimientos" RENAME COLUMN "type" TO "tipo";
ALTER TABLE "movimientos" RENAME COLUMN "counterparty" TO "contraparte";
ALTER TABLE "movimientos" RENAME COLUMN "amountCents" TO "monto_centavos";
ALTER TABLE "movimientos" RENAME COLUMN "reference" TO "referencia";
ALTER TABLE "movimientos" RENAME COLUMN "occurredAt" TO "ocurrido_en";
ALTER TABLE "movimientos" RENAME COLUMN "transferId" TO "transferencia_id";
ALTER TABLE "movimientos" RENAME COLUMN "exchangeId" TO "operacion_cambio_id";
ALTER TABLE "movimientos" RENAME COLUMN "cardId" TO "tarjeta_id";
ALTER TABLE "movimientos" RENAME CONSTRAINT "Movement_pkey" TO "movimientos_pkey";
ALTER TABLE "movimientos" RENAME CONSTRAINT "Movement_accountId_fkey" TO "movimientos_cuenta_id_fkey";
ALTER TABLE "movimientos" RENAME CONSTRAINT "Movement_transferId_fkey" TO "movimientos_transferencia_id_fkey";
ALTER TABLE "movimientos" RENAME CONSTRAINT "Movement_exchangeId_fkey" TO "movimientos_operacion_cambio_id_fkey";
ALTER TABLE "movimientos" RENAME CONSTRAINT "Movement_cardId_fkey" TO "movimientos_tarjeta_id_fkey";
ALTER INDEX "Movement_accountId_reference_key" RENAME TO "movimientos_cuenta_id_referencia_key";
ALTER INDEX "Movement_accountId_occurredAt_idx" RENAME TO "movimientos_cuenta_id_ocurrido_en_idx";
ALTER INDEX "Movement_cardId_idx" RENAME TO "movimientos_tarjeta_id_idx";
