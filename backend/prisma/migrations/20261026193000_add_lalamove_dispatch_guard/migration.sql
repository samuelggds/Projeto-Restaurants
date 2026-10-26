-- Fail-closed reservation of external courier dispatches. No booking or payment calls.
ALTER TABLE "RestaurantExternalDeliveryQuote" ADD CONSTRAINT "RestaurantExternalDeliveryQuote_id_restaurantId_key" UNIQUE ("id", "restaurantId");
CREATE TABLE "RestaurantExternalDeliveryDispatch" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "quoteId" UUID NOT NULL,
  "credentialId" UUID NOT NULL,
  "requestKey" UUID NOT NULL,
  "environment" VARCHAR(16) NOT NULL DEFAULT 'sandbox',
  "status" VARCHAR(24) NOT NULL DEFAULT 'PREPARED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "providerOrderId" VARCHAR(64),
  "providerStatus" VARCHAR(64),
  "leaseExpiresAt" TIMESTAMPTZ(3),
  "dispatchedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RestaurantExternalDeliveryDispatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantExternalDeliveryDispatch_environment_check" CHECK ("environment" = 'sandbox'),
  CONSTRAINT "RestaurantExternalDeliveryDispatch_status_check" CHECK ("status" IN ('PREPARED','DISPATCHING','UNKNOWN','ACTIVE','CANCELED','DONE','FAILED')),
  CONSTRAINT "RestaurantExternalDeliveryDispatch_version_check" CHECK ("version" > 0),
  CONSTRAINT "RestaurantExternalDeliveryDispatch_provider_check" CHECK (
    ("status" IN ('PREPARED','DISPATCHING','UNKNOWN','FAILED') OR "providerOrderId" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "RestaurantExternalDeliveryDispatch_restaurantId_orderId_key" ON "RestaurantExternalDeliveryDispatch" ("restaurantId","orderId");
CREATE UNIQUE INDEX "RestaurantExternalDeliveryDispatch_orderId_restaurantId_key" ON "RestaurantExternalDeliveryDispatch" ("orderId","restaurantId");
CREATE UNIQUE INDEX "RestaurantExternalDeliveryDispatch_quoteId_restaurantId_key" ON "RestaurantExternalDeliveryDispatch" ("quoteId","restaurantId");
CREATE UNIQUE INDEX "RestaurantExternalDeliveryDispatch_restaurantId_requestKey_key" ON "RestaurantExternalDeliveryDispatch" ("restaurantId","requestKey");
CREATE UNIQUE INDEX "RestaurantExternalDeliveryDispatch_quoteId_key" ON "RestaurantExternalDeliveryDispatch" ("quoteId");
CREATE INDEX "RestaurantExternalDeliveryDispatch_restaurantId_status_leaseExpiresAt_idx" ON "RestaurantExternalDeliveryDispatch" ("restaurantId","status","leaseExpiresAt");
ALTER TABLE "RestaurantExternalDeliveryDispatch" ADD CONSTRAINT "RestaurantExternalDeliveryDispatch_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RestaurantExternalDeliveryDispatch" ADD CONSTRAINT "RestaurantExternalDeliveryDispatch_orderId_restaurantId_fkey"
  FOREIGN KEY ("orderId","restaurantId") REFERENCES "Order"("id","restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RestaurantExternalDeliveryDispatch" ADD CONSTRAINT "RestaurantExternalDeliveryDispatch_quoteId_restaurantId_fkey"
  FOREIGN KEY ("quoteId","restaurantId") REFERENCES "RestaurantExternalDeliveryQuote"("id","restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RestaurantExternalDeliveryDispatch" ADD CONSTRAINT "RestaurantExternalDeliveryDispatch_credentialId_restaurantId_fkey"
  FOREIGN KEY ("credentialId","restaurantId") REFERENCES "RestaurantExternalDeliveryCredential"("id","restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RestaurantExternalDeliveryDispatch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantExternalDeliveryDispatch" FORCE ROW LEVEL SECURITY;
CREATE POLICY "RestaurantExternalDeliveryDispatch_tenant_isolation"
 ON "RestaurantExternalDeliveryDispatch" FOR ALL TO PUBLIC
 USING ("restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END)
 WITH CHECK ("restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END);
