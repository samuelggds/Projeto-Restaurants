-- Existing restaurant records deliberately keep NULL: legacy tenants never
-- acquire unrestricted configuration access retroactively.
ALTER TABLE "RestaurantImplementation"
  ADD COLUMN "initialSetupExpiresAt" TIMESTAMP(3),
  ADD COLUMN "initialSetupClosedAt" TIMESTAMP(3);

ALTER TABLE "RestaurantImplementation"
  ADD CONSTRAINT "RestaurantImplementation_initialSetupClose_check"
  CHECK ("initialSetupClosedAt" IS NULL OR "initialSetupExpiresAt" IS NOT NULL);
