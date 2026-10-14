-- Shipping benefits are accounted for on the delivery fee, not the cart items.
ALTER TYPE "DiscountKind" ADD VALUE IF NOT EXISTS 'FREE_SHIPPING';

CREATE TYPE "CouponAudience" AS ENUM ('ALL', 'NEW_CUSTOMERS', 'RETURNING_CUSTOMERS');

ALTER TABLE "Coupon"
  ADD COLUMN "audience" "CouponAudience" NOT NULL DEFAULT 'ALL';

CREATE INDEX "Coupon_restaurantId_kind_audience_active_idx"
  ON "Coupon" ("restaurantId", "kind", "audience", "active");
