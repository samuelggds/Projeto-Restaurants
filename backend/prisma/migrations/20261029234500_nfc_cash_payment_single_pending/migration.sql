-- Prevent two cash receipts being reserved simultaneously for the same NFC comanda.
-- The existing unique active Pix/Point checkout index remains in force.
CREATE UNIQUE INDEX "NfcComandaPayment_one_pending_cash"
  ON "NfcComandaPayment" ("restaurantId", "comandaId")
  WHERE "method" = 'DINHEIRO' AND "status" = 'PENDING';
