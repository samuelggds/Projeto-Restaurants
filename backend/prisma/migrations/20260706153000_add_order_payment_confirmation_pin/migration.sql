-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "paymentConfirmationPin" TEXT,
ADD COLUMN "paymentConfirmationPinExpiresAt" TIMESTAMP(3);
