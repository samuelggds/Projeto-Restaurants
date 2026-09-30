ALTER TABLE "OrderPaymentAttempt"
ADD COLUMN "cardPaymentType" VARCHAR(10) NOT NULL DEFAULT 'credit';

ALTER TABLE "OrderPaymentAttempt"
ADD CONSTRAINT "OrderPaymentAttempt_cardPaymentType_check"
CHECK ("cardPaymentType" IN ('credit', 'debit'));

COMMENT ON COLUMN "OrderPaymentAttempt"."cardPaymentType" IS
  'Non-sensitive card subtype used to preserve credit/debit intent across retries.';
