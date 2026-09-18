ALTER TABLE "Order"
ADD COLUMN "pixExpiresAt" TIMESTAMP(3);

CREATE INDEX "Order_status_paid_pixExpiresAt_idx"
ON "Order"("status", "paid", "pixExpiresAt");
