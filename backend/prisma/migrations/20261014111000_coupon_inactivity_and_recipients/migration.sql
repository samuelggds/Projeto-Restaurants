-- Monetary coupon properties remain unchanged. Months apply to the last valid paid order.
ALTER TABLE "Coupon" ADD COLUMN "inactivityMonths" INTEGER;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_inactivity_months_check"
  CHECK (("audience" = 'INACTIVE_CUSTOMERS' AND "inactivityMonths" BETWEEN 1 AND 36)
    OR ("audience" <> 'INACTIVE_CUSTOMERS' AND "inactivityMonths" IS NULL));
CREATE UNIQUE INDEX "Coupon_id_restaurantId_key" ON "Coupon"("id", "restaurantId");

CREATE TABLE "CouponRecipient" (
  "couponId" INTEGER NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRecipient_pkey" PRIMARY KEY ("couponId", "userId"),
  CONSTRAINT "CouponRecipient_coupon_tenant_fkey" FOREIGN KEY ("couponId", "restaurantId")
    REFERENCES "Coupon"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CouponRecipient_user_tenant_fkey" FOREIGN KEY ("userId", "restaurantId")
    REFERENCES "User"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CouponRecipient_restaurantId_userId_idx" ON "CouponRecipient" ("restaurantId", "userId");
ALTER TABLE "CouponRecipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CouponRecipient" FORCE ROW LEVEL SECURITY;
CREATE POLICY "CouponRecipient_tenant_isolation" ON "CouponRecipient"
AS PERMISSIVE FOR ALL TO PUBLIC
USING ("restaurantId" = CASE
  WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END)
WITH CHECK ("restaurantId" = CASE
  WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END);
