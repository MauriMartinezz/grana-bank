-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('SUBSCRIPTION', 'RECEIVED', 'SENT');

-- CreateEnum
CREATE TYPE "CardBrand" AS ENUM ('MASTERCARD', 'VISA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "balanceCents" INTEGER NOT NULL,
    "cardBrand" "CardBrand" NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "cardHolder" TEXT NOT NULL,
    "cardExpiry" TEXT NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "counterparty" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_key" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Movement_reference_key" ON "Movement"("reference");

-- CreateIndex
CREATE INDEX "Movement_accountId_occurredAt_idx" ON "Movement"("accountId", "occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
