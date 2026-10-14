-- Split legacy loyalty rewards from public promotional campaigns.
-- Existing coupons remain LOYALTY; never expose them to anonymous visitors.
CREATE TYPE "CouponKind" AS ENUM ('PROMOTIONAL', 'LOYALTY');
ALTER TABLE "Coupon"
  ADD COLUMN "kind" "CouponKind" NOT NULL DEFAULT 'LOYALTY',
  ADD COLUMN "usageLimit" INTEGER,
  ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "allowDelivery" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowPickup" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowTable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_usageLimit_check" CHECK ("usageLimit" IS NULL OR "usageLimit" >= 1),
  ADD CONSTRAINT "Coupon_usageCount_check" CHECK ("usageCount" >= 0),
  ADD CONSTRAINT "Coupon_allowedModes_check" CHECK ("allowDelivery" OR "allowPickup" OR "allowTable");
CREATE INDEX "Coupon_restaurantId_kind_active_expiration_idx"
 ON "Coupon"("restaurantId", "kind", "active", "expiration");
