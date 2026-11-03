-- Money columns widen from 32-bit INTEGER to 64-bit BIGINT, so a balance is
-- no longer capped at $21.474.836,47. Widening keeps every stored value as it
-- is, and Postgres keeps the CHECK constraints on these columns
-- (Account_balanceCents_non_negative, Transfer_amountCents_positive,
-- Exchange_amounts_positive) across the type change.
ALTER TABLE "Account" ALTER COLUMN "balanceCents" TYPE BIGINT;
ALTER TABLE "Movement" ALTER COLUMN "amountCents" TYPE BIGINT;
ALTER TABLE "Transfer" ALTER COLUMN "amountCents" TYPE BIGINT;
ALTER TABLE "Exchange" ALTER COLUMN "usdCents" TYPE BIGINT,
                       ALTER COLUMN "arsCents" TYPE BIGINT;
