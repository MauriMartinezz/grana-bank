-- CreateEnum
CREATE TYPE "frecuencia_ingreso" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "ingresos_programados" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "moneda" "moneda" NOT NULL,
    "monto_centavos" BIGINT NOT NULL,
    "frecuencia" "frecuencia_ingreso" NOT NULL,
    "dia" INTEGER NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingresos_programados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingresos_programados_usuario_id_idx" ON "ingresos_programados"("usuario_id");

-- AddForeignKey
ALTER TABLE "ingresos_programados" ADD CONSTRAINT "ingresos_programados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A positive amount within the deposit caps ($1.000.000 or USD 10.000), and a
-- day that fits the frequency.
ALTER TABLE "ingresos_programados" ADD CONSTRAINT "ingresos_programados_valores" CHECK (
  "monto_centavos" > 0
  AND "monto_centavos" <= CASE "moneda"::text WHEN 'USD' THEN 1000000 ELSE 100000000 END
  AND (
    ("frecuencia"::text = 'WEEKLY' AND "dia" BETWEEN 1 AND 7)
    OR ("frecuencia"::text = 'MONTHLY' AND "dia" BETWEEN 1 AND 31)
  )
);
