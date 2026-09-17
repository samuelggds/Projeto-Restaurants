CREATE TABLE "DeliveryNavigationSession" (
  "id" BIGSERIAL NOT NULL,
  "orderId" INTEGER NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "courierId" INTEGER NOT NULL,
  "tripId" UUID NOT NULL,
  "authTokenEncrypted" TEXT NOT NULL,
  "authTokenExpiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DeliveryNavigationSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryNavigationSession_orderId_key" UNIQUE ("orderId"),
  CONSTRAINT "DeliveryNavigationSession_tripId_key" UNIQUE ("tripId"),
  CONSTRAINT "DeliveryNavigationSession_order_fkey"
    FOREIGN KEY ("orderId", "restaurantId") REFERENCES "Order"("id", "restaurantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DeliveryNavigationSession_courier_fkey"
    FOREIGN KEY ("courierId", "restaurantId") REFERENCES "User"("id", "restaurantId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DeliveryNavigationSession_restaurantId_courierId_idx"
  ON "DeliveryNavigationSession"("restaurantId", "courierId");

CREATE INDEX "DeliveryNavigationSession_authTokenExpiresAt_idx"
  ON "DeliveryNavigationSession"("authTokenExpiresAt");
