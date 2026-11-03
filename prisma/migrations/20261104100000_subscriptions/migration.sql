-- CreateEnum
CREATE TYPE "estado_suscripcion" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "comercio" TEXT NOT NULL,
    "monto_centavos" BIGINT NOT NULL,
    "moneda" "moneda" NOT NULL DEFAULT 'ARS',
    "tarjeta_id" TEXT,
    "dia_cobro" INTEGER NOT NULL,
    "estado" "estado_suscripcion" NOT NULL DEFAULT 'ACTIVE',
    "dada_de_baja_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suscripciones_usuario_id_idx" ON "suscripciones"("usuario_id");

-- CreateIndex
CREATE INDEX "suscripciones_tarjeta_id_idx" ON "suscripciones"("tarjeta_id");

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_tarjeta_id_fkey" FOREIGN KEY ("tarjeta_id") REFERENCES "tarjetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A positive amount, a day of the month, and a cancel date exactly when cancelled.
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_valores" CHECK (
  "monto_centavos" > 0
  AND "dia_cobro" BETWEEN 1 AND 31
  AND (("estado" = 'CANCELLED') = ("dada_de_baja_en" IS NOT NULL))
);
