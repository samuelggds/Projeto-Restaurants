-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "payOnDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payOnDeliveryMethod" "PaymentMethod";
