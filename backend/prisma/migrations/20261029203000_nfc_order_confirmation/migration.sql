-- Short-lived in-person order confirmation with tenant-scoped RLS and durable rate limiting.
ALTER TABLE "NfcCard" ADD COLUMN "failedOrderConfirmAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "NfcCard" ADD COLUMN "orderConfirmationLockedUntil" TIMESTAMPTZ(3);
ALTER TABLE "NfcCard" ADD CONSTRAINT "NfcCard_failedOrderConfirmAttempts_check"
  CHECK ("failedOrderConfirmAttempts" >= 0 AND "failedOrderConfirmAttempts" <= 3);

CREATE TABLE "NfcOrderConfirmation" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "comandaId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "cardId" UUID NOT NULL,
  "createdByUserId" INTEGER NOT NULL,
  "requestKeyHash" CHAR(64) NOT NULL,
  "orderFingerprint" CHAR(64) NOT NULL,
  "draftItems" JSONB NOT NULL,
  "observation" VARCHAR(400),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "verifiedAt" TIMESTAMPTZ(3),
  "consumedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "NfcOrderConfirmation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NfcOrderConfirmation_attempts_check" CHECK ("attempts" >= 0 AND "attempts" <= 3)
);
CREATE UNIQUE INDEX "NfcOrderConfirmation_id_restaurantId_key"
  ON "NfcOrderConfirmation"("id", "restaurantId");
CREATE UNIQUE INDEX "NfcOrderConfirmation_restaurantId_comandaId_requestKeyHash_key"
  ON "NfcOrderConfirmation"("restaurantId", "comandaId", "requestKeyHash");
CREATE INDEX "NfcOrderConfirmation_restaurantId_cardId_expiresAt_idx"
  ON "NfcOrderConfirmation"("restaurantId", "cardId", "expiresAt");
CREATE INDEX "NfcOrderConfirmation_restaurantId_comandaId_createdAt_idx"
  ON "NfcOrderConfirmation"("restaurantId", "comandaId", "createdAt");

ALTER TABLE "NfcOrderConfirmation"
  ADD CONSTRAINT "NfcOrderConfirmation_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NfcOrderConfirmation_comandaId_restaurantId_fkey"
    FOREIGN KEY ("comandaId", "restaurantId") REFERENCES "NfcComanda"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NfcOrderConfirmation_customerId_restaurantId_fkey"
    FOREIGN KEY ("customerId", "restaurantId") REFERENCES "NfcCustomer"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "NfcOrderConfirmation_cardId_restaurantId_fkey"
    FOREIGN KEY ("cardId", "restaurantId") REFERENCES "NfcCard"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NfcOrderConfirmation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NfcOrderConfirmation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "NfcOrderConfirmation_tenant_isolation" ON "NfcOrderConfirmation"
  FOR ALL TO PUBLIC
  USING ("restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END)
  WITH CHECK ("restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END);
