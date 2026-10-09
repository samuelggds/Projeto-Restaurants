-- Multi-tenant onboarding only: no API credentials and no charges.
CREATE TABLE "RestaurantExternalDeliveryOnboarding" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "provider" VARCHAR(24) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'REQUESTED',
  "requestedByUserId" INTEGER NOT NULL,
  "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "RestaurantExternalDeliveryOnboarding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantExternalDeliveryOnboarding_provider_check"
    CHECK ("provider" IN ('LALAMOVE')),
  CONSTRAINT "RestaurantExternalDeliveryOnboarding_status_check"
    CHECK ("status" IN ('REQUESTED', 'IN_REVIEW', 'ACTION_REQUIRED', 'SUSPENDED'))
);

CREATE UNIQUE INDEX "RestaurantExternalDeliveryOnboarding_restaurantId_provider_key"
  ON "RestaurantExternalDeliveryOnboarding"("restaurantId", "provider");

CREATE INDEX "RestaurantExternalDeliveryOnboarding_status_requestedAt_idx"
  ON "RestaurantExternalDeliveryOnboarding"("status", "requestedAt");

ALTER TABLE "RestaurantExternalDeliveryOnboarding"
  ADD CONSTRAINT "RestaurantExternalDeliveryOnboarding_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Composite FK prevents references to an admin from a different tenant.
ALTER TABLE "RestaurantExternalDeliveryOnboarding"
  ADD CONSTRAINT "RestaurantExternalDeliveryOnboarding_requestedByUserId_restaurantId_fkey"
  FOREIGN KEY ("requestedByUserId", "restaurantId") REFERENCES "User"("id", "restaurantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RestaurantExternalDeliveryOnboarding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantExternalDeliveryOnboarding" FORCE ROW LEVEL SECURITY;

CREATE POLICY "RestaurantExternalDeliveryOnboarding_tenant_isolation"
ON "RestaurantExternalDeliveryOnboarding"
AS PERMISSIVE FOR ALL TO PUBLIC
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
