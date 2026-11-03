-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "empresa_servicio" ADD VALUE 'SALUD_PLENA';
ALTER TYPE "empresa_servicio" ADD VALUE 'AUSTRAL_SEGUROS';

-- The payment number CHECK, with the dollar companies: Salud Plena 8 and
-- Austral Seguros 9 digits (see features/services/companies.ts). It compares
-- the company as text, because a new enum value cannot be used in the
-- transaction that adds it. An unknown company matches no pattern and fails.
ALTER TABLE "adhesiones_servicio" DROP CONSTRAINT "adhesiones_servicio_numero_formato";
ALTER TABLE "adhesiones_servicio" ADD CONSTRAINT "adhesiones_servicio_numero_formato" CHECK (
  "numero_pago" ~ CASE "empresa"::text
    WHEN 'AYSA' THEN '^[0-9]{10}$'
    WHEN 'EDESUR' THEN '^[0-9]{10}$'
    WHEN 'EDENOR' THEN '^[0-9]{12}$'
    WHEN 'METROGAS' THEN '^[0-9]{11}$'
    WHEN 'SALUD_PLENA' THEN '^[0-9]{8}$'
    WHEN 'AUSTRAL_SEGUROS' THEN '^[0-9]{9}$'
    ELSE '^$'
  END
);
