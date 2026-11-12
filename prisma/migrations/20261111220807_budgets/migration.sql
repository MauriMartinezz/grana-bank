-- CreateTable
CREATE TABLE "presupuestos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "moneda" "moneda" NOT NULL,
    "monto_centavos" BIGINT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presupuestos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presupuestos_categoria_id_idx" ON "presupuestos"("categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "presupuestos_usuario_id_categoria_id_moneda_key" ON "presupuestos"("usuario_id", "categoria_id", "moneda");

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A budget is always a positive amount.
ALTER TABLE "presupuestos" ADD CONSTRAINT "presupuestos_monto_positivo" CHECK ("monto_centavos" > 0);
