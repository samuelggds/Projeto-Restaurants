-- AlterTable
ALTER TABLE "RestaurantSettings"
ADD COLUMN "bankName" TEXT,
ADD COLUMN "bankBranch" TEXT,
ADD COLUMN "bankAccount" TEXT,
ADD COLUMN "cardGateway" TEXT,
ADD COLUMN "gatewayMerchantId" TEXT;
