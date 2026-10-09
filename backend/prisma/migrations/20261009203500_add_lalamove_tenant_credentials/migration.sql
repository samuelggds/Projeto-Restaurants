-- Each restaurant owns separate Lalamove credentials and wallet identity.
-- Nullable encrypted material allows safe revocation without retaining secrets.
CREATE TABLE "RestaurantExternalDeliveryCredential" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "provider" VARCHAR(24) NOT NULL,
  "environment" VARCHAR(16) NOT NULL,
  "apiKeyEncrypted" TEXT,
  "apiSecretEncrypted" TEXT,
  "apiKeyDigest" VARCHAR(64),
  "status" VARCHAR(24) NOT NULL DEFAULT 'STORED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "verifiedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "updatedByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RestaurantExternalDeliveryCredential_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantExternalDeliveryCredential_provider_check" CHECK ("provider" = 'LALAMOVE'),
  CONSTRAINT "RestaurantExternalDeliveryCredential_environment_check" CHECK ("environment" IN ('sandbox', 'production')),
  CONSTRAINT "RestaurantExternalDeliveryCredential_version_check" CHECK ("version" > 0),
  CONSTRAINT "RestaurantExternalDeliveryCredential_material_check" CHECK (
    ("status" = 'REVOKED' AND "apiKeyEncrypted" IS NULL AND
     "apiSecretEncrypted" IS NULL AND "apiKeyDigest" IS NULL AND
     "verifiedAt" IS NULL AND "revokedAt" IS NOT NULL)
    OR
    ("status" IN ('STORED', 'VERIFIED_SANDBOX') AND
     "apiKeyEncrypted" LIKE 'enc:v1:%' AND
     "apiSecretEncrypted" LIKE 'enc:v1:%' AND
     "apiKeyDigest" ~ '^[a-f0-9]{64}$' AND
     "revokedAt" IS NULL AND
     ("status" <> 'VERIFIED_SANDBOX' OR ("environment" = 'sandbox' AND "verifiedAt" IS NOT NULL)))
  )
);
CREATE UNIQUE INDEX "RestaurantExternalDeliveryCredential_restaurantId_provider_environment_key"
  ON "RestaurantExternalDeliveryCredential"("restaurantId", "provider", "environment");
-- Prevent accidentally reusing the same provider account across restaurants.
CREATE UNIQUE INDEX "RestaurantExternalDeliveryCredential_environment_apiKeyDigest_key"
  ON "RestaurantExternalDeliveryCredential"("environment", "apiKeyDigest");
ALTER TABLE "RestaurantExternalDeliveryCredential"
  ADD CONSTRAINT "RestaurantExternalDeliveryCredential_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestaurantExternalDeliveryCredential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantExternalDeliveryCredential" FORCE ROW LEVEL SECURITY;
CREATE POLICY "RestaurantExternalDeliveryCredential_tenant_isolation"
ON "RestaurantExternalDeliveryCredential"
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
