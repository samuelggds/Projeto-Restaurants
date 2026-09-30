ALTER TABLE "OrderPaymentAttempt"
ADD COLUMN "cardBrand" VARCHAR(32),
ADD COLUMN "cardLast4" VARCHAR(4);

ALTER TABLE "OrderPaymentAttempt"
ADD CONSTRAINT "OrderPaymentAttempt_cardLast4_check"
CHECK ("cardLast4" IS NULL OR "cardLast4" ~ '^[0-9]{4}$');

COMMENT ON COLUMN "OrderPaymentAttempt"."cardBrand" IS
  'Non-sensitive normalized card brand used only for customer-facing payment status display.';

COMMENT ON COLUMN "OrderPaymentAttempt"."cardLast4" IS
  'Non-sensitive last four digits used only for customer-facing payment status display.';
