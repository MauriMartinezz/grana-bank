-- CreateEnum
CREATE TYPE "categoria_promocion" AS ENUM ('DEPORTES', 'SUPERMERCADO', 'CINE', 'GIMNASIO', 'ROPA', 'FARMACIA');

-- CreateTable
CREATE TABLE "promociones" (
    "id" TEXT NOT NULL,
    "comercio" TEXT NOT NULL,
    "categoria" "categoria_promocion" NOT NULL,
    "porcentaje" INTEGER NOT NULL,
    "tope_centavos" BIGINT NOT NULL,
    "dias" INTEGER[],
    "marca_tarjeta" "marca_tarjeta",
    "vigente_desde" DATE NOT NULL,
    "vigente_hasta" DATE NOT NULL,
    "condiciones" TEXT NOT NULL,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promociones_categoria_idx" ON "promociones"("categoria");

-- A percentage from 1 to 100, a positive cap, at least one weekday from 1
-- (Monday) to 7 (Sunday), and a validity that ends after it starts.
ALTER TABLE "promociones" ADD CONSTRAINT "promociones_valores" CHECK (
  "porcentaje" BETWEEN 1 AND 100
  AND "tope_centavos" > 0
  AND cardinality("dias") BETWEEN 1 AND 7
  AND "dias" <@ ARRAY[1, 2, 3, 4, 5, 6, 7]
  AND "vigente_hasta" >= "vigente_desde"
);
