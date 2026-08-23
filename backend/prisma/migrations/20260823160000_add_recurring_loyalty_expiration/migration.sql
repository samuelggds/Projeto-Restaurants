-- Make loyalty rewards recurring while keeping only a bounded number of
-- unconsumed rewards in each customer's wallet.
ALTER TYPE "CouponRedemptionStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "Coupon"
  ADD COLUMN "redemptionValidityDays" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_redemptionValidityDays_check"
  CHECK ("redemptionValidityDays" >= 1 AND "redemptionValidityDays" <= 365);

ALTER TABLE "CouponRedemption"
  ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "CouponRedemption" AS redemption
SET "expiresAt" = LEAST(
  redemption."claimedAt" + (coupon."redemptionValidityDays" * INTERVAL '1 day'),
  COALESCE(coupon."expiration", 'infinity'::timestamp)
)
FROM "Coupon" AS coupon
WHERE coupon."id" = redemption."couponId";

ALTER TABLE "CouponRedemption"
  ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX "CouponRedemption_restaurantId_userId_status_expiresAt_idx"
  ON "CouponRedemption"("restaurantId", "userId", "status", "expiresAt");
