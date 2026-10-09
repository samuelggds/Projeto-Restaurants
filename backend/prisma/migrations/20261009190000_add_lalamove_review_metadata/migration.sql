-- Review metadata is restricted to a bounded reason code, not arbitrary notes or keys.
-- No transition in this migration can mark a courier account connected.
ALTER TABLE "RestaurantExternalDeliveryOnboarding"
  ADD COLUMN "reviewReasonCode" VARCHAR(48),
  ADD COLUMN "reviewedAt" TIMESTAMPTZ(3),
  ADD COLUMN "reviewedByUserId" INTEGER;

ALTER TABLE "RestaurantExternalDeliveryOnboarding"
  ADD CONSTRAINT "RestaurantExternalDeliveryOnboarding_reviewReasonCode_check"
  CHECK (
    "reviewReasonCode" IS NULL
    OR "reviewReasonCode" IN (
      'PROVIDER_APPROVAL',
      'MERCHANT_ACCOUNT',
      'WALLET_BALANCE',
      'SERVICE_COVERAGE',
      'THERMAL_BAG',
      'OTHER'
    )
  );
