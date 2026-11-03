-- Top-ups: saved SUBE cards and SUBE, phone and DirecTV top-ups paid from a
-- peso card. Only new tables, enum types, an enum value and a nullable column:
-- no existing row changes.
-- CreateEnum
CREATE TYPE "tipo_recarga" AS ENUM ('SUBE', 'PHONE', 'DIRECTV');

-- CreateEnum
CREATE TYPE "proveedor_recarga" AS ENUM ('SUBE', 'PERSONAL', 'MOVISTAR', 'CLARO', 'TUENTI', 'DIRECTV');

-- AlterEnum
ALTER TYPE "tipo_movimiento" ADD VALUE 'TOP_UP';

-- AlterTable
ALTER TABLE "movimientos" ADD COLUMN     "recarga_id" TEXT;

-- CreateTable
CREATE TABLE "tarjetas_sube" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "apodo" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarjetas_sube_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recargas" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "tipo_recarga" NOT NULL,
    "proveedor" "proveedor_recarga" NOT NULL,
    "destino" TEXT NOT NULL,
    "monto_centavos" BIGINT NOT NULL,
    "cuenta_id" TEXT NOT NULL,
    "tarjeta_id" TEXT,
    "clave_idempotencia" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recargas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tarjetas_sube_usuario_id_numero_key" ON "tarjetas_sube"("usuario_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "recargas_numero_key" ON "recargas"("numero");

-- CreateIndex
CREATE INDEX "recargas_cuenta_id_idx" ON "recargas"("cuenta_id");

-- CreateIndex
CREATE INDEX "recargas_tarjeta_id_idx" ON "recargas"("tarjeta_id");

-- CreateIndex
CREATE UNIQUE INDEX "recargas_usuario_id_clave_idempotencia_key" ON "recargas"("usuario_id", "clave_idempotencia");

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_recarga_id_fkey" FOREIGN KEY ("recarga_id") REFERENCES "recargas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarjetas_sube" ADD CONSTRAINT "tarjetas_sube_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recargas" ADD CONSTRAINT "recargas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recargas" ADD CONSTRAINT "recargas_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recargas" ADD CONSTRAINT "recargas_tarjeta_id_fkey" FOREIGN KEY ("tarjeta_id") REFERENCES "tarjetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CHECK constraints Prisma cannot express.
ALTER TABLE "tarjetas_sube" ADD CONSTRAINT "tarjetas_sube_numero_formato" CHECK ("numero" ~ '^6061[0-9]{12}$');
ALTER TABLE "recargas" ADD CONSTRAINT "recargas_monto_positivo" CHECK ("monto_centavos" > 0);
