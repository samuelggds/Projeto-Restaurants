-- Only a locally prepared, never-booked Lalamove dispatch may be cancelled
-- without a provider order. ACTIVE and DONE continue to require a provider ID.
-- Keep the existing status, environment, tenant FKs and FORCE RLS unchanged.
ALTER TABLE "RestaurantExternalDeliveryDispatch"
  DROP CONSTRAINT "RestaurantExternalDeliveryDispatch_provider_check",
  ADD CONSTRAINT "RestaurantExternalDeliveryDispatch_provider_check"
  CHECK (
    "status" IN ('PREPARED', 'DISPATCHING', 'UNKNOWN', 'FAILED')
    OR "providerOrderId" IS NOT NULL
    OR (
      "status" = 'CANCELED'
      AND "providerOrderId" IS NULL
      AND "dispatchedAt" IS NULL
    )
  );
