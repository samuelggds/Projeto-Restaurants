ALTER TABLE "DeliveryPayment"
ADD COLUMN "pixCopyPaste" TEXT,
ADD COLUMN "pixQrCodeBase64" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3);
