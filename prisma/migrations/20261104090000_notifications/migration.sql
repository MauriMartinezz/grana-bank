-- AlterTable
ALTER TABLE "adhesiones_servicio" ADD COLUMN     "dias_recordatorio" INTEGER;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "notificaciones_vistas_en" TIMESTAMP(3);

-- A reminder is the same day or 1, 3 or 7 days before the due date.
ALTER TABLE "adhesiones_servicio" ADD CONSTRAINT "adhesiones_servicio_dias_recordatorio" CHECK (
  "dias_recordatorio" IS NULL OR "dias_recordatorio" IN (0, 1, 3, 7)
);
