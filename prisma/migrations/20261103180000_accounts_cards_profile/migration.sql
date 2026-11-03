-- Accounts per currency, cards, contacts by account, profile fields and
-- dollar exchanges. Written by hand: every existing row is carried over
-- (cards, contacts and names are backfilled before the old columns go).

-- New enum values. Nothing below uses them, so they can be added in the same
-- transaction as the rest of the migration.
ALTER TYPE "MovementType" ADD VALUE 'EXCHANGE';
ALTER TYPE "CardBrand" ADD VALUE 'AMEX';

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "ExchangeDirection" AS ENUM ('BUY', 'SELL');

-- Account currency: stored money is never relabeled. Every existing account
-- keeps its stored code (an unknown code makes the cast, and so the whole
-- migration, fail); only the default for new accounts becomes ARS.
ALTER TABLE "Account" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "Account"
  ALTER COLUMN "currency" TYPE "Currency" USING "currency"::"Currency";
ALTER TABLE "Account" ALTER COLUMN "currency" SET DEFAULT 'ARS';

-- One account per user and currency, instead of one account per user.
DROP INDEX "Account_userId_key";
CREATE UNIQUE INDEX "Account_userId_currency_key" ON "Account"("userId", "currency");

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "brand" "CardBrand" NOT NULL,
    "last4" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "expiry" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Card_accountId_idx" ON "Card"("accountId");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Each existing account becomes the owner of the card it described.
INSERT INTO "Card" ("id", "accountId", "brand", "last4", "holder", "expiry")
SELECT gen_random_uuid()::text, "id", "cardBrand", "cardLast4", "cardHolder", "cardExpiry"
FROM "Account";

ALTER TABLE "Account"
  DROP COLUMN "cardBrand",
  DROP COLUMN "cardLast4",
  DROP COLUMN "cardHolder",
  DROP COLUMN "cardExpiry";

-- Only the card face is stored: 4 digits and MM/YY leave no room for a full
-- card number or a security code.
ALTER TABLE "Card" ADD CONSTRAINT "Card_last4_format" CHECK ("last4" ~ '^[0-9]{4}$');
ALTER TABLE "Card" ADD CONSTRAINT "Card_expiry_format" CHECK (
  "expiry" ~ '^(0[1-9]|1[0-2])/[0-9]{2}$'
);

-- User: the name splits at the first space; a single word becomes the first
-- name with an empty last name.
ALTER TABLE "User"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "preferredCurrency" "Currency" NOT NULL DEFAULT 'ARS';

UPDATE "User"
SET
  "firstName" = CASE
    WHEN strpos("name", ' ') > 0 THEN substr("name", 1, strpos("name", ' ') - 1)
    ELSE "name"
  END,
  "lastName" = CASE
    WHEN strpos("name", ' ') > 0 THEN substr("name", strpos("name", ' ') + 1)
    ELSE ''
  END;

-- Existing users had a single account: it stays the one shown first.
UPDATE "User" AS u
SET "preferredCurrency" = a."currency"
FROM "Account" AS a
WHERE a."userId" = u."id";

ALTER TABLE "User"
  ALTER COLUMN "firstName" SET NOT NULL,
  ALTER COLUMN "lastName" SET NOT NULL,
  DROP COLUMN "name";

-- Contact: points at the contact user's account instead of the user. Every
-- user had at most one account, so the mapping is unambiguous. A contact
-- whose user has no account could never be shown or paid, so it is dropped.
ALTER TABLE "Contact" ADD COLUMN "contactAccountId" TEXT;

UPDATE "Contact" AS c
SET "contactAccountId" = a."id"
FROM "Account" AS a
WHERE a."userId" = c."contactId";

DELETE FROM "Contact" WHERE "contactAccountId" IS NULL;

ALTER TABLE "Contact" DROP CONSTRAINT "Contact_contactId_fkey";
DROP INDEX "Contact_ownerId_contactId_key";
ALTER TABLE "Contact"
  DROP COLUMN "contactId",
  ALTER COLUMN "contactAccountId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_ownerId_contactAccountId_key" ON "Contact"("ownerId", "contactAccountId");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_contactAccountId_fkey" FOREIGN KEY ("contactAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Exchange" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "ExchangeDirection" NOT NULL,
    "usdCents" INTEGER NOT NULL,
    "arsCents" INTEGER NOT NULL,
    "rateArsPerUsd" INTEGER NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exchange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exchange_number_key" ON "Exchange"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Exchange_userId_idempotencyKey_key" ON "Exchange"("userId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same guards as Transfer, kept by the database even if the service has a bug.
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_amounts_positive" CHECK (
  "usdCents" > 0 AND "arsCents" > 0 AND "rateArsPerUsd" > 0
);
ALTER TABLE "Exchange" ADD CONSTRAINT "Exchange_distinct_accounts" CHECK ("fromAccountId" <> "toAccountId");

-- AlterTable
ALTER TABLE "Movement" ADD COLUMN "exchangeId" TEXT;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE SET NULL ON UPDATE CASCADE;
