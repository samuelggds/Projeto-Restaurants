-- A redeemed reward is part of the customer's wallet and audit history.
-- Campaign deletion must never cascade into existing redemptions.
ALTER TABLE "CouponRedemption"
  DROP CONSTRAINT "CouponRedemption_couponId_fkey";

ALTER TABLE "CouponRedemption"
  ADD CONSTRAINT "CouponRedemption_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
