ALTER TABLE "Order"
ADD COLUMN "assignedCourierId" INTEGER,
ADD COLUMN "deliveryStartedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3);

ALTER TABLE "Order"
ADD CONSTRAINT "Order_assignedCourierId_fkey"
FOREIGN KEY ("assignedCourierId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Order_restaurantId_status_assignedCourierId_idx"
ON "Order"("restaurantId", "status", "assignedCourierId");

CREATE INDEX "Order_assignedCourierId_deliveryStartedAt_idx"
ON "Order"("assignedCourierId", "deliveryStartedAt");
