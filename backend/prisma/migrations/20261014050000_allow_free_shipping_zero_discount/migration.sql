-- Previously, Coupon_discount_check required discount > 0 for every reward.
-- A shipping benefit has no product discount: discount = 0, while its delivery
-- subsidy is computed separately by the backend on the actual delivery fee.
-- Contract only the constraint: preserve all existing coupons and reject zero
-- product discounts for FIXED/PERCENTAGE, unauthorized channels or loyalty.
BEGIN;

ALTER TABLE "Coupon"
  DROP CONSTRAINT "Coupon_discount_check";

ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_discount_check" CHECK (
    (
      "discountType" = 'FREE_SHIPPING'
      AND "kind" = 'PROMOTIONAL'
      AND "discount" = 0
      AND "allowDelivery" = true
      AND "allowPickup" = false
      AND "allowTable" = false
    )
    OR (
      "discountType" <> 'FREE_SHIPPING'
      AND "discount" > 0
    )
  );

COMMIT;
