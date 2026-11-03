-- AlterTable
ALTER TABLE "cuentas" ADD COLUMN     "tarjeta_predeterminada_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_tarjeta_predeterminada_id_key" ON "cuentas"("tarjeta_predeterminada_id");

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_tarjeta_predeterminada_id_fkey" FOREIGN KEY ("tarjeta_predeterminada_id") REFERENCES "tarjetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

