ALTER TABLE "Invoice"
  ADD COLUMN "paymentExternalId" TEXT,
  ADD COLUMN "pixQrCode" TEXT,
  ADD COLUMN "pixQrCodeBase64" TEXT,
  ADD COLUMN "pixExpiresAt" TIMESTAMP(3);
