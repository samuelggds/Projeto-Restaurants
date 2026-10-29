-- NFC orders reuse the central pricing, stock, queue and kitchen pipeline.
ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'NFC';
ALTER TABLE "Order" ADD COLUMN "nfcComandaId" UUID;
CREATE INDEX "Order_restaurantId_nfcComandaId_idx" ON "Order" ("restaurantId", "nfcComandaId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_nfcComandaId_restaurantId_fkey"
  FOREIGN KEY ("nfcComandaId", "restaurantId") REFERENCES "NfcComanda"("id", "restaurantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NfcComandaItem" ADD COLUMN "sourceOrderItemId" INTEGER;
DROP INDEX "NfcComandaItem_restaurantId_sourceOrderId_key";
CREATE UNIQUE INDEX "NfcComandaItem_restaurantId_sourceOrderItemId_key"
  ON "NfcComandaItem" ("restaurantId", "sourceOrderItemId");
CREATE INDEX "NfcComandaItem_restaurantId_sourceOrderId_idx"
  ON "NfcComandaItem" ("restaurantId", "sourceOrderId");
ALTER TABLE "NfcOrderConfirmation" ADD COLUMN "orderId" INTEGER;
CREATE UNIQUE INDEX "NfcOrderConfirmation_restaurantId_orderId_key"
  ON "NfcOrderConfirmation" ("restaurantId", "orderId");
ALTER TABLE "NfcOrderConfirmation" ADD CONSTRAINT "NfcOrderConfirmation_orderId_restaurantId_fkey"
  FOREIGN KEY ("orderId", "restaurantId") REFERENCES "Order"("id", "restaurantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
