ALTER TABLE "RestaurantSettings"
ADD COLUMN "courierFeePerDelivery" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "Order"
ADD COLUMN "courierEarning" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "courierPaidAt" TIMESTAMP(3);

CREATE TABLE "DeliveryLocation" (
  "id" BIGSERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "courierId" INTEGER NOT NULL,
  "latitude" DECIMAL(10,7) NOT NULL,
  "longitude" DECIMAL(10,7) NOT NULL,
  "heading" DOUBLE PRECISION,
  "speed" DOUBLE PRECISION,
  "accuracy" DOUBLE PRECISION,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryLocation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DeliveryLocation"
ADD CONSTRAINT "DeliveryLocation_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliveryLocation"
ADD CONSTRAINT "DeliveryLocation_courierId_fkey"
FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DeliveryLocation_orderId_recordedAt_idx"
ON "DeliveryLocation"("orderId", "recordedAt");

CREATE INDEX "DeliveryLocation_courierId_recordedAt_idx"
ON "DeliveryLocation"("courierId", "recordedAt");
