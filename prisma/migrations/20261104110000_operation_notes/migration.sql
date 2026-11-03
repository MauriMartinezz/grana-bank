-- AlterTable
ALTER TABLE "pagos_servicio" ADD COLUMN     "nota" TEXT;

-- AlterTable
ALTER TABLE "recargas" ADD COLUMN     "nota" TEXT;

-- A note of 1 to 140 characters when present, as on transfers.
ALTER TABLE "recargas" ADD CONSTRAINT "recargas_nota_largo" CHECK ("nota" IS NULL OR char_length("nota") BETWEEN 1 AND 140);
ALTER TABLE "pagos_servicio" ADD CONSTRAINT "pagos_servicio_nota_largo" CHECK ("nota" IS NULL OR char_length("nota") BETWEEN 1 AND 140);
