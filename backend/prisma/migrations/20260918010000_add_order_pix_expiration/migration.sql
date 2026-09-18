ALTER TABLE "Order"
ADD COLUMN "onlinePaymentExpiresAt" TIMESTAMP(3);

CREATE INDEX "Order_status_paid_onlinePaymentExpiresAt_idx"
ON "Order"("status", "paid", "onlinePaymentExpiresAt");
