CREATE TYPE "OrderPaymentAttemptStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'APPROVED',
  'DECLINED',
  'FAILED',
  'CANCELED',
  'EXPIRED',
  'REFUNDED'
);

CREATE TABLE "OrderPaymentAttempt" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "orderId" INTEGER NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "OrderPaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(10,2) NOT NULL,
  "providerOrderId" TEXT,
  "providerPaymentId" TEXT,
  "providerStatus" TEXT,
  "providerStatusDetail" TEXT,
  "providerRequestId" TEXT,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderPaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderPaymentAttempt_publicId_key"
  ON "OrderPaymentAttempt"("publicId");
CREATE UNIQUE INDEX "OrderPaymentAttempt_idempotencyKey_key"
  ON "OrderPaymentAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "OrderPaymentAttempt_id_restaurantId_key"
  ON "OrderPaymentAttempt"("id", "restaurantId");
CREATE INDEX "OrderPaymentAttempt_restaurantId_orderId_createdAt_idx"
  ON "OrderPaymentAttempt"("restaurantId", "orderId", "createdAt");
CREATE INDEX "OrderPaymentAttempt_restaurantId_status_createdAt_idx"
  ON "OrderPaymentAttempt"("restaurantId", "status", "createdAt");
CREATE INDEX "OrderPaymentAttempt_provider_providerOrderId_idx"
  ON "OrderPaymentAttempt"("provider", "providerOrderId");
CREATE INDEX "OrderPaymentAttempt_provider_providerPaymentId_idx"
  ON "OrderPaymentAttempt"("provider", "providerPaymentId");

ALTER TABLE "OrderPaymentAttempt"
  ADD CONSTRAINT "OrderPaymentAttempt_orderId_restaurantId_fkey"
  FOREIGN KEY ("orderId", "restaurantId")
  REFERENCES "Order"("id", "restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderPaymentAttempt"
  ADD CONSTRAINT "OrderPaymentAttempt_restaurantId_fkey"
  FOREIGN KEY ("restaurantId")
  REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderPaymentAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderPaymentAttempt" FORCE ROW LEVEL SECURITY;

CREATE POLICY "OrderPaymentAttempt_tenant_isolation"
ON "OrderPaymentAttempt"
AS PERMISSIVE
FOR ALL
TO PUBLIC
USING (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
)
WITH CHECK (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
);
