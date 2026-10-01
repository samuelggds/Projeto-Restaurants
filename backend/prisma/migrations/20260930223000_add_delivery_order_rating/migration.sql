ALTER TABLE "Order"
ADD COLUMN "deliveryRating" INTEGER,
ADD COLUMN "deliveryRatedAt" TIMESTAMP(3);

ALTER TABLE "Order"
ADD CONSTRAINT "Order_deliveryRating_check"
CHECK ("deliveryRating" IS NULL OR ("deliveryRating" >= 1 AND "deliveryRating" <= 5));

CREATE INDEX "Order_restaurantId_deliveryRating_idx"
ON "Order"("restaurantId", "deliveryRating")
WHERE "deliveryRating" IS NOT NULL;
