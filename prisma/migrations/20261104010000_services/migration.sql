-- Services: adhered utility services, their simulated bills and the payments
-- that settle them. Only new tables, enum types, an enum value and a nullable
-- column: no existing row changes.
-- CreateEnum
CREATE TYPE "empresa_servicio" AS ENUM ('AYSA', 'EDESUR', 'EDENOR', 'METROGAS');

-- CreateEnum
CREATE TYPE "estado_factura" AS ENUM ('PENDING', 'PAID');

-- AlterEnum
ALTER TYPE "tipo_movimiento" ADD VALUE 'SERVICE_PAYMENT';

-- AlterTable
ALTER TABLE "movimientos" ADD COLUMN     "pago_servicio_id" TEXT;

-- CreateTable
CREATE TABLE "adhesiones_servicio" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "empresa" "empresa_servicio" NOT NULL,
    "numero_pago" TEXT NOT NULL,
    "apodo" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adhesiones_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas_servicio" (
    "id" TEXT NOT NULL,
    "adhesion_id" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "monto_centavos" BIGINT NOT NULL,
    "moneda" "moneda" NOT NULL DEFAULT 'ARS',
    "vence_el" DATE NOT NULL,
    "estado" "estado_factura" NOT NULL DEFAULT 'PENDING',
    "pagada_en" TIMESTAMP(3),

    CONSTRAINT "facturas_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_servicio" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "factura_id" TEXT NOT NULL,
    "cuenta_id" TEXT NOT NULL,
    "tarjeta_id" TEXT,
    "monto_centavos" BIGINT NOT NULL,
    "clave_idempotencia" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adhesiones_servicio_usuario_id_empresa_numero_pago_key" ON "adhesiones_servicio"("usuario_id", "empresa", "numero_pago");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_servicio_adhesion_id_periodo_key" ON "facturas_servicio"("adhesion_id", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_servicio_numero_key" ON "pagos_servicio"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_servicio_factura_id_key" ON "pagos_servicio"("factura_id");

-- CreateIndex
CREATE INDEX "pagos_servicio_cuenta_id_idx" ON "pagos_servicio"("cuenta_id");

-- CreateIndex
CREATE INDEX "pagos_servicio_tarjeta_id_idx" ON "pagos_servicio"("tarjeta_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_servicio_usuario_id_clave_idempotencia_key" ON "pagos_servicio"("usuario_id", "clave_idempotencia");

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_pago_servicio_id_fkey" FOREIGN KEY ("pago_servicio_id") REFERENCES "pagos_servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adhesiones_servicio" ADD CONSTRAINT "adhesiones_servicio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_servicio" ADD CONSTRAINT "facturas_servicio_adhesion_id_fkey" FOREIGN KEY ("adhesion_id") REFERENCES "adhesiones_servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_servicio" ADD CONSTRAINT "pagos_servicio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_servicio" ADD CONSTRAINT "pagos_servicio_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas_servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_servicio" ADD CONSTRAINT "pagos_servicio_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_servicio" ADD CONSTRAINT "pagos_servicio_tarjeta_id_fkey" FOREIGN KEY ("tarjeta_id") REFERENCES "tarjetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- CHECK constraints Prisma cannot express.
-- Simulated electronic payment number lengths: AySA 10, Edesur 10, Edenor 12,
-- Metrogas 11 digits (see features/services/companies.ts).
ALTER TABLE "adhesiones_servicio" ADD CONSTRAINT "adhesiones_servicio_numero_formato" CHECK (
  "numero_pago" ~ CASE "empresa"
    WHEN 'AYSA' THEN '^[0-9]{10}$'
    WHEN 'EDESUR' THEN '^[0-9]{10}$'
    WHEN 'EDENOR' THEN '^[0-9]{12}$'
    WHEN 'METROGAS' THEN '^[0-9]{11}$'
  END
);
ALTER TABLE "facturas_servicio" ADD CONSTRAINT "facturas_servicio_monto_positivo" CHECK ("monto_centavos" > 0);
-- A paid bill has its payment date, and a pending one has none.
ALTER TABLE "facturas_servicio" ADD CONSTRAINT "facturas_servicio_pagada_con_fecha" CHECK (("estado" = 'PAID') = ("pagada_en" IS NOT NULL));
ALTER TABLE "pagos_servicio" ADD CONSTRAINT "pagos_servicio_monto_positivo" CHECK ("monto_centavos" > 0);
