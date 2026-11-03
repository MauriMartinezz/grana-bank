-- Records the card each movement went through, so a row can say
-- "Tarjeta terminada en 8845".
ALTER TABLE "Movement" ADD COLUMN "cardId" TEXT;

-- Existing movements get their account's first card (earliest createdAt,
-- ties broken by id). Movements of accounts without cards stay empty.
UPDATE "Movement" AS m
SET "cardId" = first_card."id"
FROM (
  SELECT DISTINCT ON ("accountId") "id", "accountId"
  FROM "Card"
  ORDER BY "accountId", "createdAt", "id"
) AS first_card
WHERE first_card."accountId" = m."accountId";

-- CreateIndex
CREATE INDEX "Movement_cardId_idx" ON "Movement"("cardId");

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
