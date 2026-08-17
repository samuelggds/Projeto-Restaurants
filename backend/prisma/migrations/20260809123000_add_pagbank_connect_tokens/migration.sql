ALTER TABLE "RestaurantSettings"
ADD COLUMN "pagbankRefreshToken" TEXT,
ADD COLUMN "pagbankTokenExpiresAt" TIMESTAMP(3);
