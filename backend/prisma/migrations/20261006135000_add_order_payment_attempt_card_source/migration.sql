ALTER TABLE "OrderPaymentAttempt"
ADD COLUMN "cardSource" VARCHAR(16) NOT NULL DEFAULT 'new_card';
