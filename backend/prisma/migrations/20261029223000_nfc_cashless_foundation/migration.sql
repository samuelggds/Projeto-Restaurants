-- NFC cashless foundation; checkout is kept disabled until provider reconciliation is tested.
CREATE TYPE "NfcCashlessPaymentStatus" AS ENUM ('RESERVED','PROCESSING','PAID','FAILED','EXPIRED','CANCELED','REFUNDED');
CREATE TABLE "NfcComandaAccess" (
 "id" UUID NOT NULL, "restaurantId" INTEGER NOT NULL, "comandaId" UUID NOT NULL, "codeHash" CHAR(64) NOT NULL,
 "sessionHash" CHAR(64), "attempts" INTEGER NOT NULL DEFAULT 0, "lockedUntil" TIMESTAMPTZ(3),
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "sessionExpiresAt" TIMESTAMPTZ(3), "revokedAt" TIMESTAMPTZ(3),
 "createdByUserId" INTEGER NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
 CONSTRAINT "NfcComandaAccess_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "NfcComandaAccess_attempts_check" CHECK ("attempts" BETWEEN 0 AND 5)
);
CREATE UNIQUE INDEX "NfcComandaAccess_id_restaurantId_key" ON "NfcComandaAccess"("id","restaurantId");
CREATE UNIQUE INDEX "NfcComandaAccess_sessionHash_key" ON "NfcComandaAccess"("sessionHash");
CREATE INDEX "NfcComandaAccess_restaurantId_comandaId_expiresAt_idx" ON "NfcComandaAccess"("restaurantId","comandaId","expiresAt");
ALTER TABLE "NfcComandaAccess" ADD CONSTRAINT "NfcComandaAccess_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NfcComandaAccess" ADD CONSTRAINT "NfcComandaAccess_comandaId_restaurantId_fkey" FOREIGN KEY ("comandaId","restaurantId") REFERENCES "NfcComanda"("id","restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "NfcCashlessPayment" (
 "id" UUID NOT NULL, "restaurantId" INTEGER NOT NULL, "comandaId" UUID NOT NULL,
 "method" "PaymentMethod" NOT NULL, "status" "NfcCashlessPaymentStatus" NOT NULL DEFAULT 'RESERVED',
 "amountCents" BIGINT NOT NULL, "idempotencyKeyHash" CHAR(64) NOT NULL, "requestFingerprint" CHAR(64) NOT NULL,
 "provider" VARCHAR(40) NOT NULL, "providerExternalId" VARCHAR(160), "providerPaymentCode" TEXT,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "paidAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(), "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "NfcCashlessPayment_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "NfcCashlessPayment_amount_positive" CHECK ("amountCents" > 0)
);
CREATE UNIQUE INDEX "NfcCashlessPayment_id_restaurantId_key" ON "NfcCashlessPayment"("id","restaurantId");
CREATE UNIQUE INDEX "NfcCashlessPayment_restaurantId_comandaId_idempotencyKeyHash_key" ON "NfcCashlessPayment"("restaurantId","comandaId","idempotencyKeyHash");
CREATE UNIQUE INDEX "NfcCashlessPayment_provider_providerExternalId_key" ON "NfcCashlessPayment"("provider","providerExternalId");
CREATE INDEX "NfcCashlessPayment_restaurantId_comandaId_status_expiresAt_idx" ON "NfcCashlessPayment"("restaurantId","comandaId","status","expiresAt");
-- Only one checkout may reserve any balance for a comanda at a time.
CREATE UNIQUE INDEX "NfcCashlessPayment_one_active_checkout"
 ON "NfcCashlessPayment"("restaurantId","comandaId") WHERE "status" IN ('RESERVED','PROCESSING');
ALTER TABLE "NfcCashlessPayment" ADD CONSTRAINT "NfcCashlessPayment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NfcCashlessPayment" ADD CONSTRAINT "NfcCashlessPayment_comandaId_restaurantId_fkey" FOREIGN KEY ("comandaId","restaurantId") REFERENCES "NfcComanda"("id","restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NfcComandaAccess" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NfcComandaAccess" FORCE ROW LEVEL SECURITY;
CREATE POLICY "NfcComandaAccess_tenant_isolation" ON "NfcComandaAccess" FOR ALL TO PUBLIC
 USING ("restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$' THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END)
 WITH CHECK ("restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$' THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END);
ALTER TABLE "NfcCashlessPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NfcCashlessPayment" FORCE ROW LEVEL SECURITY;
CREATE POLICY "NfcCashlessPayment_tenant_isolation" ON "NfcCashlessPayment" FOR ALL TO PUBLIC
 USING ("restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$' THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END)
 WITH CHECK ("restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$' THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END);
