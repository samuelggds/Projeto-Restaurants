ALTER TABLE "RestaurantSettings"
  ADD COLUMN "mercadoPagoRefreshToken" TEXT,
  ADD COLUMN "mercadoPagoTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "mercadoPagoPublicKey" TEXT,
  ADD COLUMN "asaasAccountId" TEXT,
  ADD COLUMN "asaasWebhookId" TEXT,
  ADD COLUMN "asaasWebhookTokenHash" TEXT,
  ADD COLUMN "asaasOnboardingState" TEXT;

ALTER TABLE "TablePaymentIntent" ADD COLUMN "providerChargeId" TEXT;
CREATE UNIQUE INDEX "TablePaymentIntent_provider_providerChargeId_key"
  ON "TablePaymentIntent"("provider", "providerChargeId");
