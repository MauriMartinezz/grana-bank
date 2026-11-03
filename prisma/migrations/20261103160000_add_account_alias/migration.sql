-- Existing accounts get a generated alias before the column becomes required:
-- "gb." plus the first 12 hex digits of the account id, which always has a
-- letter and fits the alias rule.
ALTER TABLE "Account" ADD COLUMN "alias" TEXT;

UPDATE "Account"
SET "alias" = 'gb.' || substr(replace(lower("id"), '-', ''), 1, 12)
WHERE "alias" IS NULL;

ALTER TABLE "Account" ALTER COLUMN "alias" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Account_alias_key" ON "Account"("alias");

-- Same rule as features/transfers/alias.ts. Lower case only, so the unique
-- index also makes aliases unique regardless of case.
ALTER TABLE "Account" ADD CONSTRAINT "Account_alias_format" CHECK (
  "alias" ~ '^[a-z0-9.]{1,40}$' AND "alias" ~ '[a-z]'
);
