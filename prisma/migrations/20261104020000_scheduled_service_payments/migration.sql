-- CreateEnum
CREATE TYPE "motivo_fallo_pago" AS ENUM ('INSUFFICIENT_FUNDS', 'CARD_UNAVAILABLE');

-- AlterTable
ALTER TABLE "adhesiones_servicio" ADD COLUMN     "tarjeta_debito_id" TEXT;

-- AlterTable
ALTER TABLE "facturas_servicio" ADD COLUMN     "fallo_en" TIMESTAMP(3),
ADD COLUMN     "motivo_fallo" "motivo_fallo_pago",
ADD COLUMN     "programada_para" DATE,
ADD COLUMN     "tarjeta_programada_id" TEXT;

-- CreateIndex
CREATE INDEX "facturas_servicio_tarjeta_programada_id_idx" ON "facturas_servicio"("tarjeta_programada_id");

-- AddForeignKey
ALTER TABLE "adhesiones_servicio" ADD CONSTRAINT "adhesiones_servicio_tarjeta_debito_id_fkey" FOREIGN KEY ("tarjeta_debito_id") REFERENCES "tarjetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas_servicio" ADD CONSTRAINT "facturas_servicio_tarjeta_programada_id_fkey" FOREIGN KEY ("tarjeta_programada_id") REFERENCES "tarjetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A failure always says why, and only a pending bill can fail.
ALTER TABLE "facturas_servicio" ADD CONSTRAINT "facturas_servicio_fallo_con_motivo" CHECK (("fallo_en" IS NULL) = ("motivo_fallo" IS NULL));
ALTER TABLE "facturas_servicio" ADD CONSTRAINT "facturas_servicio_fallo_pendiente" CHECK ("fallo_en" IS NULL OR "estado" = 'PENDING');
