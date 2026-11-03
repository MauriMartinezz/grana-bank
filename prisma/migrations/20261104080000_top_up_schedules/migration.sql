-- The frequency enum now serves deposits and top-ups: renamed in place, so
-- existing scheduled deposits and their CHECK keep their data.
ALTER TYPE "frecuencia_ingreso" RENAME TO "frecuencia_programada";

-- CreateTable
CREATE TABLE "recargas_programadas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tarjeta_sube_id" TEXT NOT NULL,
    "monto_centavos" BIGINT NOT NULL,
    "frecuencia" "frecuencia_programada" NOT NULL,
    "dia" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recargas_programadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recargas_programadas_usuario_id_idx" ON "recargas_programadas"("usuario_id");

-- CreateIndex
CREATE INDEX "recargas_programadas_tarjeta_sube_id_idx" ON "recargas_programadas"("tarjeta_sube_id");

-- AddForeignKey
ALTER TABLE "recargas_programadas" ADD CONSTRAINT "recargas_programadas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recargas_programadas" ADD CONSTRAINT "recargas_programadas_tarjeta_sube_id_fkey" FOREIGN KEY ("tarjeta_sube_id") REFERENCES "tarjetas_sube"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A top-up amount ($100 to $50.000) and a day that fits the frequency.
ALTER TABLE "recargas_programadas" ADD CONSTRAINT "recargas_programadas_valores" CHECK (
  "monto_centavos" BETWEEN 10000 AND 5000000
  AND (
    ("frecuencia"::text = 'WEEKLY' AND "dia" BETWEEN 1 AND 7)
    OR ("frecuencia"::text = 'MONTHLY' AND "dia" BETWEEN 1 AND 31)
  )
);
