CREATE TYPE "OrderRefundStatus" AS ENUM (
  'NOT_REQUESTED',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED'
);

ALTER TABLE "Order"
ADD COLUMN "refundStatus" "OrderRefundStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN "refundRequestedAt" TIMESTAMP(3),
ADD COLUMN "refundedAt" TIMESTAMP(3),
ADD COLUMN "refundFailureReason" TEXT,
ADD COLUMN "refundIdempotencyKey" TEXT,
ADD COLUMN "refundProvider" TEXT,
ADD COLUMN "refundExternalId" TEXT;

CREATE INDEX "Order_restaurantId_refundStatus_idx"
ON "Order"("restaurantId", "refundStatus");
