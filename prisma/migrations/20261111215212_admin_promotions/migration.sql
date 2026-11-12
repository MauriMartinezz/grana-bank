-- CreateEnum
CREATE TYPE "rol_usuario" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "promociones" ADD COLUMN     "banco" TEXT,
ADD COLUMN     "compra_minima_centavos" BIGINT,
ALTER COLUMN "tope_centavos" DROP NOT NULL;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "rol" "rol_usuario" NOT NULL DEFAULT 'USER';
