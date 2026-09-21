ALTER TABLE "AiCreditWallet"
  ADD COLUMN "debtMicros" BIGINT NOT NULL DEFAULT 0,
  ADD CONSTRAINT "AiCreditWallet_debt_nonnegative" CHECK ("debtMicros" >= 0);

ALTER TABLE "AiCreditTopUp"
  ADD COLUMN "reversedUsdMicros" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "reversalPending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reversalSnapshotAt" TIMESTAMP(3),
  ADD CONSTRAINT "AiCreditTopUp_reversal_bounds"
    CHECK ("reversedUsdMicros" >= 0 AND "reversedUsdMicros" <= "creditUsdMicros");

COMMENT ON COLUMN "AiCreditWallet"."debtMicros" IS
  'Reversed purchases already spent or reserved; offsets future credit before any new AI usage.';

COMMENT ON COLUMN "AiCreditTopUp"."reversalPending" IS
  'Canonical provider reversal lacks a confirmed amount; hold new AI usage without inventing a debit.';
