ALTER TABLE "CustomerPaymentMethod" ADD COLUMN "providerCustomerId" TEXT;
CREATE INDEX "CustomerPaymentMethod_provider_customer_idx" ON "CustomerPaymentMethod"("provider", "providerCustomerId");
