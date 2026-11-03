-- AlterTable
ALTER TABLE "movimientos" ADD COLUMN     "categoria_id" TEXT;

-- AlterTable
ALTER TABLE "transferencias" ADD COLUMN     "nota" TEXT;

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_usuario_id_clave_key" ON "categorias"("usuario_id", "clave");

-- CreateIndex
CREATE INDEX "movimientos_categoria_id_idx" ON "movimientos"("categoria_id");

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A trimmed name of 1 to 30 characters, and a note of 1 to 140 when present.
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_nombre_formato" CHECK (
  char_length("nombre") BETWEEN 1 AND 30 AND "nombre" = btrim("nombre") AND "clave" <> ''
);
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_nota_largo" CHECK (
  "nota" IS NULL OR char_length("nota") BETWEEN 1 AND 140
);

-- Existing users start with the default categories, as new ones do.
INSERT INTO "categorias" ("id", "usuario_id", "nombre", "clave")
SELECT gen_random_uuid()::text, u."id", d."nombre", d."clave"
FROM "usuarios" u
CROSS JOIN (VALUES
  ('Alquiler', 'alquiler'),
  ('Comida', 'comida'),
  ('Servicios', 'servicios'),
  ('Regalos', 'regalos'),
  ('Otros', 'otros')
) AS d("nombre", "clave");
