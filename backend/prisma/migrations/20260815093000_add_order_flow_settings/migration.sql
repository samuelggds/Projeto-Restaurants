ALTER TABLE "RestaurantSettings"
  ADD COLUMN "autoAcceptOrders" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "trackingRequiresLogin" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "soundNotifications" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "maxConcurrentOrders" INTEGER NOT NULL DEFAULT 20;
