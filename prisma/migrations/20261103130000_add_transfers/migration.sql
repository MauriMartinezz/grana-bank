-- DropIndex
DROP INDEX "Movement_reference_key";

-- AlterTable
ALTER TABLE "Movement" ADD COLUMN     "transferId" TEXT;

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contact_ownerId_contactId_key" ON "Contact"("ownerId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_number_key" ON "Transfer"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_fromAccountId_idempotencyKey_key" ON "Transfer"("fromAccountId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Movement_accountId_reference_key" ON "Movement"("accountId", "reference");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Database-level guards that Prisma cannot express. The transfer service
-- already enforces them; these keep the data valid even if it has a bug.
ALTER TABLE "Account" ADD CONSTRAINT "Account_balanceCents_non_negative" CHECK ("balanceCents" >= 0);
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_amountCents_positive" CHECK ("amountCents" > 0);
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_distinct_accounts" CHECK ("fromAccountId" <> "toAccountId");
