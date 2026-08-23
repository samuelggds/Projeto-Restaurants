-- Product promotions, authoritative order pricing snapshots and loyalty coupons.
CREATE TYPE "DiscountKind" AS ENUM ('FIXED', 'PERCENTAGE');
CREATE TYPE "CouponRedemptionStatus" AS ENUM ('CLAIMED', 'RESERVED', 'USED');

CREATE TABLE "ProductDiscount" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "kind" "DiscountKind" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDiscount_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProductDiscount_value_check" CHECK ("value" > 0),
    CONSTRAINT "ProductDiscount_percentage_check" CHECK (
      "kind" <> 'PERCENTAGE' OR "value" < 100
    ),
    CONSTRAINT "ProductDiscount_period_check" CHECK (
      "startsAt" IS NULL OR "endsAt" IS NULL OR "startsAt" < "endsAt"
    )
);

CREATE UNIQUE INDEX "ProductDiscount_productId_key" ON "ProductDiscount"("productId");
CREATE INDEX "ProductDiscount_restaurantId_active_idx" ON "ProductDiscount"("restaurantId", "active");
CREATE INDEX "ProductDiscount_restaurantId_startsAt_endsAt_idx" ON "ProductDiscount"("restaurantId", "startsAt", "endsAt");

ALTER TABLE "ProductDiscount"
  ADD CONSTRAINT "ProductDiscount_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductDiscount"
  ADD CONSTRAINT "ProductDiscount_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Coupon"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "discountType" "DiscountKind" NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "minimumSubtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "maxDiscount" DECIMAL(10,2),
  ADD COLUMN "loyaltyPurchasesRequired" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "perCustomerLimit" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- The legacy index is case-sensitive, so codes such as fidelidade/FIDELIDADE
-- may coexist. Rebuild it after normalizing and preserve every legacy row with
-- a deterministic suffix instead of aborting the deployment.
DROP INDEX IF EXISTS "Coupon_restaurantId_code_key";

WITH normalized_codes AS (
  SELECT
    "id",
    "restaurantId",
    UPPER(TRIM("code")) AS normalized_code,
    ROW_NUMBER() OVER (
      PARTITION BY "restaurantId", UPPER(TRIM("code"))
      ORDER BY "id"
    ) AS duplicate_position
  FROM "Coupon"
)
UPDATE "Coupon" AS coupon
SET "code" = CASE
  WHEN normalized_codes.duplicate_position = 1 THEN normalized_codes.normalized_code
  ELSE CONCAT(
    normalized_codes.normalized_code,
    '__LEGACY_R',
    normalized_codes."restaurantId",
    '_C',
    normalized_codes."id"
  )
END
FROM normalized_codes
WHERE coupon."id" = normalized_codes."id";

CREATE UNIQUE INDEX "Coupon_restaurantId_code_key"
  ON "Coupon"("restaurantId", "code");

-- Legacy coupons had no validation at the database boundary. Keep invalid
-- rows for audit, but deactivate and sanitize them before adding constraints.
UPDATE "Coupon"
SET
  "active" = false,
  "discount" = CASE WHEN "discount" <= 0 THEN 0.01 ELSE "discount" END,
  "minimumSubtotal" = GREATEST("minimumSubtotal", 0),
  "maxDiscount" = CASE
    WHEN "maxDiscount" IS NOT NULL AND "maxDiscount" <= 0 THEN NULL
    ELSE "maxDiscount"
  END
WHERE
  "discount" <= 0 OR
  "minimumSubtotal" < 0 OR
  ("maxDiscount" IS NOT NULL AND "maxDiscount" <= 0);

ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_discount_check" CHECK ("discount" > 0),
  ADD CONSTRAINT "Coupon_percentage_check" CHECK (
    "discountType" <> 'PERCENTAGE' OR "discount" < 100
  ),
  ADD CONSTRAINT "Coupon_minimumSubtotal_check" CHECK ("minimumSubtotal" >= 0),
  ADD CONSTRAINT "Coupon_maxDiscount_check" CHECK ("maxDiscount" IS NULL OR "maxDiscount" > 0),
  ADD CONSTRAINT "Coupon_loyaltyPurchasesRequired_check" CHECK ("loyaltyPurchasesRequired" >= 1),
  ADD CONSTRAINT "Coupon_perCustomerLimit_check" CHECK ("perCustomerLimit" >= 1);

CREATE INDEX "Coupon_restaurantId_active_expiration_idx" ON "Coupon"("restaurantId", "active", "expiration");

CREATE TABLE "CouponRedemption" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "couponId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "cycle" INTEGER NOT NULL,
    "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'CLAIMED',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CouponRedemption_cycle_check" CHECK ("cycle" >= 1)
);

CREATE UNIQUE INDEX "CouponRedemption_restaurantId_couponId_userId_cycle_key"
  ON "CouponRedemption"("restaurantId", "couponId", "userId", "cycle");
CREATE INDEX "CouponRedemption_restaurantId_userId_status_idx"
  ON "CouponRedemption"("restaurantId", "userId", "status");
CREATE INDEX "CouponRedemption_couponId_status_idx"
  ON "CouponRedemption"("couponId", "status");

ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD COLUMN "itemsSubtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "productDiscountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "couponDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "couponId" INTEGER,
  ADD COLUMN "couponRedemptionId" INTEGER,
  ADD COLUMN "couponCode" TEXT;

UPDATE "Order" SET "itemsSubtotal" = "total";

CREATE UNIQUE INDEX "Order_couponRedemptionId_key" ON "Order"("couponRedemptionId");
CREATE INDEX "Order_restaurantId_userId_status_paid_deliveredAt_idx"
  ON "Order"("restaurantId", "userId", "status", "paid", "deliveredAt");

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_couponRedemptionId_fkey"
  FOREIGN KEY ("couponRedemptionId") REFERENCES "CouponRedemption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD COLUMN "originalUnitPrice" DECIMAL(10,2),
  ADD COLUMN "unitDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "OrderItem" SET "originalUnitPrice" = "price";
