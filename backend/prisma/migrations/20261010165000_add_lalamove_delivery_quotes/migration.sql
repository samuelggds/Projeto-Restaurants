-- Fail-closed quote storage with a composite FK to both the order and restaurant's credential.
-- No order placement, payment or courier assignment is performed by this migration.
ALTER TABLE "RestaurantExternalDeliveryCredential"
  ADD CONSTRAINT "RestaurantExternalDeliveryCredential_id_restaurantId_key"
  UNIQUE ("id", "restaurantId");
CREATE TABLE "RestaurantExternalDeliveryQuote" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "credentialId" UUID NOT NULL,
  "credentialVersion" INTEGER NOT NULL,
  "requestKey" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(24) NOT NULL DEFAULT 'REQUESTING',
  "quotationId" VARCHAR(40),
  "serviceType" VARCHAR(24),
  "thermalBagRequest" VARCHAR(40) NOT NULL DEFAULT 'THERMAL_BAG_1',
  "total" DECIMAL(10,2),
  "currency" VARCHAR(3),
  "pickupStopId" VARCHAR(40),
  "dropoffStopId" VARCHAR(40),
  "addressDigest" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMPTZ(3),
  "approvedByUserId" INTEGER,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RestaurantExternalDeliveryQuote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantExternalDeliveryQuote_version_check" CHECK ("version" > 0 AND "credentialVersion" > 0),
  CONSTRAINT "RestaurantExternalDeliveryQuote_status_check" CHECK ("status" IN
    ('REQUESTING','AVAILABLE','APPROVED','REJECTED','FAILED','EXPIRED')),
  CONSTRAINT "RestaurantExternalDeliveryQuote_thermal_check" CHECK ("thermalBagRequest" = 'THERMAL_BAG_1'),
  CONSTRAINT "RestaurantExternalDeliveryQuote_digest_check" CHECK ("addressDigest" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "RestaurantExternalDeliveryQuote_approval_check" CHECK (
    ("approvedAt" IS NULL AND "approvedByUserId" IS NULL)
    OR ("approvedAt" IS NOT NULL AND "approvedByUserId" IS NOT NULL)
  ),
  CONSTRAINT "RestaurantExternalDeliveryQuote_price_check" CHECK (
    ("total" IS NULL AND "currency" IS NULL AND "quotationId" IS NULL AND "serviceType" IS NULL AND
      "pickupStopId" IS NULL AND "dropoffStopId" IS NULL)
    OR ("total" > 0 AND "currency" = 'BRL' AND "quotationId" ~ '^[0-9]{1,24}$' AND
      "serviceType" IN ('LALAGO','LALAPRO') AND
      "pickupStopId" ~ '^[0-9]{1,24}$' AND "dropoffStopId" ~ '^[0-9]{1,24}$')
  ),
  CONSTRAINT "RestaurantExternalDeliveryQuote_required_quote_check" CHECK (
    "status" NOT IN ('AVAILABLE','APPROVED','REJECTED')
    OR ("total" IS NOT NULL AND "currency" = 'BRL')
  )
);
CREATE UNIQUE INDEX "RestaurantExternalDeliveryQuote_restaurantId_orderId_key"
  ON "RestaurantExternalDeliveryQuote" ("restaurantId","orderId");
CREATE UNIQUE INDEX "RestaurantExternalDeliveryQuote_restaurantId_requestKey_key"
  ON "RestaurantExternalDeliveryQuote" ("restaurantId","requestKey");
CREATE INDEX "RestaurantExternalDeliveryQuote_restaurantId_status_expiresAt_idx"
  ON "RestaurantExternalDeliveryQuote" ("restaurantId","status","expiresAt");
ALTER TABLE "RestaurantExternalDeliveryQuote" ADD CONSTRAINT "RestaurantExternalDeliveryQuote_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantExternalDeliveryQuote" ADD CONSTRAINT "RestaurantExternalDeliveryQuote_orderId_restaurantId_fkey"
  FOREIGN KEY ("orderId","restaurantId") REFERENCES "Order"("id","restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantExternalDeliveryQuote" ADD CONSTRAINT "RestaurantExternalDeliveryQuote_credentialId_restaurantId_fkey"
  FOREIGN KEY ("credentialId","restaurantId") REFERENCES "RestaurantExternalDeliveryCredential"("id","restaurantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RestaurantExternalDeliveryQuote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantExternalDeliveryQuote" FORCE ROW LEVEL SECURITY;
CREATE POLICY "RestaurantExternalDeliveryQuote_tenant_isolation"
ON "RestaurantExternalDeliveryQuote" FOR ALL TO PUBLIC
USING (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END
)
WITH CHECK (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END
);
