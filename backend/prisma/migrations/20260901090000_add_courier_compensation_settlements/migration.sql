-- Courier compensation and bilateral settlement ledger.
-- Customer delivery fees remain independent from courier compensation.

CREATE TYPE "CourierCompensationModel" AS ENUM (
  'FIXED_PER_DELIVERY',
  'DISTANCE_RANGES',
  'BASE_PLUS_DISTANCE'
);

CREATE TYPE "CourierSettlementStatus" AS ENUM (
  'AWAITING_COURIER_CONFIRMATION',
  'CONFIRMED',
  'DISPUTED',
  'CANCELED'
);

CREATE TYPE "CourierSettlementPaymentMethod" AS ENUM (
  'PIX',
  'CASH',
  'BANK_TRANSFER',
  'OTHER'
);

ALTER TABLE "RestaurantSettings"
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE "Order"
ADD COLUMN "courierEarningCalculatedAt" TIMESTAMP(3),
ADD COLUMN "courierCompensationModel" "CourierCompensationModel",
ADD COLUMN "deliveryDistanceMeters" INTEGER;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_deliveryDistanceMeters_check"
CHECK ("deliveryDistanceMeters" IS NULL OR "deliveryDistanceMeters" >= 0);

CREATE TABLE "CourierCompensationPolicy" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "courierId" INTEGER,
  "model" "CourierCompensationModel" NOT NULL DEFAULT 'FIXED_PER_DELIVERY',
  "fixedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "baseAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "includedDistanceMeters" INTEGER NOT NULL DEFAULT 0,
  "extraPerKmAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourierCompensationPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourierCompensationPolicy_amounts_check" CHECK (
    "fixedAmount" >= 0 AND "baseAmount" >= 0 AND "extraPerKmAmount" >= 0
  ),
  CONSTRAINT "CourierCompensationPolicy_distance_check" CHECK ("includedDistanceMeters" >= 0),
  CONSTRAINT "CourierCompensationPolicy_version_check" CHECK ("version" > 0)
);

CREATE TABLE "CourierCompensationRange" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "policyId" INTEGER NOT NULL,
  "maxDistanceMeters" INTEGER NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourierCompensationRange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourierCompensationRange_distance_check" CHECK ("maxDistanceMeters" > 0),
  CONSTRAINT "CourierCompensationRange_amount_check" CHECK ("amount" >= 0)
);

CREATE TABLE "CourierSettlement" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "courierId" INTEGER NOT NULL,
  "status" "CourierSettlementStatus" NOT NULL DEFAULT 'AWAITING_COURIER_CONFIRMATION',
  "grossCourierEarnings" DECIMAL(10,2) NOT NULL,
  "cashCollectedAmount" DECIMAL(10,2) NOT NULL,
  "netAmount" DECIMAL(10,2) NOT NULL,
  "paymentMethod" "CourierSettlementPaymentMethod",
  "adminNote" VARCHAR(500),
  "evidenceUrl" VARCHAR(1000),
  "disputeReason" VARCHAR(500),
  "adminDeclaredPaidAt" TIMESTAMP(3) NOT NULL,
  "courierConfirmedAt" TIMESTAMP(3),
  "disputedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdByUserId" INTEGER NOT NULL,
  "canceledByUserId" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourierSettlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourierSettlement_amounts_check" CHECK (
    "grossCourierEarnings" >= 0 AND "cashCollectedAmount" >= 0
  ),
  CONSTRAINT "CourierSettlement_net_check" CHECK (
    "netAmount" = "grossCourierEarnings" - "cashCollectedAmount"
  ),
  CONSTRAINT "CourierSettlement_version_check" CHECK ("version" > 0)
);

CREATE TABLE "CourierSettlementItem" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "settlementId" INTEGER NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "courierEarningSnapshot" DECIMAL(10,2) NOT NULL,
  "cashCollectedSnapshot" DECIMAL(10,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourierSettlementItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourierSettlementItem_amounts_check" CHECK (
    "courierEarningSnapshot" >= 0 AND "cashCollectedSnapshot" >= 0
  )
);

CREATE UNIQUE INDEX "CourierCompensationPolicy_publicId_key"
ON "CourierCompensationPolicy"("publicId");
CREATE UNIQUE INDEX "CourierCompensationPolicy_id_restaurantId_key"
ON "CourierCompensationPolicy"("id", "restaurantId");
CREATE UNIQUE INDEX "CourierCompensationPolicy_restaurant_default_key"
ON "CourierCompensationPolicy"("restaurantId") WHERE "courierId" IS NULL;
CREATE UNIQUE INDEX "CourierCompensationPolicy_restaurantId_courierId_key"
ON "CourierCompensationPolicy"("restaurantId", "courierId");
CREATE INDEX "CourierCompensationPolicy_restaurantId_updatedAt_idx"
ON "CourierCompensationPolicy"("restaurantId", "updatedAt");

CREATE UNIQUE INDEX "CourierCompensationRange_publicId_key"
ON "CourierCompensationRange"("publicId");
CREATE UNIQUE INDEX "CourierCompensationRange_policyId_maxDistanceMeters_key"
ON "CourierCompensationRange"("policyId", "maxDistanceMeters");
CREATE INDEX "CourierCompensationRange_restaurantId_policyId_maxDistanceMeters_idx"
ON "CourierCompensationRange"("restaurantId", "policyId", "maxDistanceMeters");

CREATE UNIQUE INDEX "CourierSettlement_publicId_key"
ON "CourierSettlement"("publicId");
CREATE UNIQUE INDEX "CourierSettlement_id_restaurantId_key"
ON "CourierSettlement"("id", "restaurantId");
CREATE INDEX "CourierSettlement_restaurantId_courierId_status_createdAt_idx"
ON "CourierSettlement"("restaurantId", "courierId", "status", "createdAt");

CREATE UNIQUE INDEX "CourierSettlementItem_publicId_key"
ON "CourierSettlementItem"("publicId");
CREATE INDEX "CourierSettlementItem_restaurantId_orderId_active_idx"
ON "CourierSettlementItem"("restaurantId", "orderId", "active");
CREATE INDEX "CourierSettlementItem_settlementId_restaurantId_idx"
ON "CourierSettlementItem"("settlementId", "restaurantId");
-- Database-level concurrency protection: an order can belong to only one
-- non-canceled settlement, even when two admins submit simultaneously.
CREATE UNIQUE INDEX "CourierSettlementItem_active_order_key"
ON "CourierSettlementItem"("orderId") WHERE "active" = true;

ALTER TABLE "CourierCompensationPolicy"
ADD CONSTRAINT "CourierCompensationPolicy_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourierCompensationPolicy"
ADD CONSTRAINT "CourierCompensationPolicy_courierId_fkey"
FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourierCompensationRange"
ADD CONSTRAINT "CourierCompensationRange_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourierCompensationRange"
ADD CONSTRAINT "CourierCompensationRange_policyId_restaurantId_fkey"
FOREIGN KEY ("policyId", "restaurantId") REFERENCES "CourierCompensationPolicy"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourierSettlement"
ADD CONSTRAINT "CourierSettlement_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourierSettlement"
ADD CONSTRAINT "CourierSettlement_courierId_fkey"
FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CourierSettlementItem"
ADD CONSTRAINT "CourierSettlementItem_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourierSettlementItem"
ADD CONSTRAINT "CourierSettlementItem_settlementId_restaurantId_fkey"
FOREIGN KEY ("settlementId", "restaurantId") REFERENCES "CourierSettlement"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourierSettlementItem"
ADD CONSTRAINT "CourierSettlementItem_orderId_restaurantId_fkey"
FOREIGN KEY ("orderId", "restaurantId") REFERENCES "Order"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve the former fixed courier fee as the initial default policy.
INSERT INTO "CourierCompensationPolicy" (
  "restaurantId", "model", "fixedAmount", "createdAt", "updatedAt"
)
SELECT
  r."id",
  'FIXED_PER_DELIVERY'::"CourierCompensationModel",
  COALESCE(s."courierFeePerDelivery", 0),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Restaurant" r
LEFT JOIN "RestaurantSettings" s ON s."restaurantId" = r."id";

-- All new financial tables fail closed without app.restaurant_id. Explicit
-- tenant predicates in application queries remain mandatory defense in depth.
ALTER TABLE "CourierCompensationPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourierCompensationPolicy" FORCE ROW LEVEL SECURITY;
CREATE POLICY "CourierCompensationPolicy_tenant_isolation"
ON "CourierCompensationPolicy" AS PERMISSIVE FOR ALL TO PUBLIC
USING (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END
)
WITH CHECK (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END
);

ALTER TABLE "CourierCompensationRange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourierCompensationRange" FORCE ROW LEVEL SECURITY;
CREATE POLICY "CourierCompensationRange_tenant_isolation"
ON "CourierCompensationRange" AS PERMISSIVE FOR ALL TO PUBLIC
USING (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END
)
WITH CHECK (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END
);

ALTER TABLE "CourierSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourierSettlement" FORCE ROW LEVEL SECURITY;
CREATE POLICY "CourierSettlement_tenant_isolation"
ON "CourierSettlement" AS PERMISSIVE FOR ALL TO PUBLIC
USING (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END
)
WITH CHECK (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END
);

ALTER TABLE "CourierSettlementItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourierSettlementItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "CourierSettlementItem_tenant_isolation"
ON "CourierSettlementItem" AS PERMISSIVE FOR ALL TO PUBLIC
USING (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END
)
WITH CHECK (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END
);
