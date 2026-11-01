ALTER TABLE "NfcCustomer" ADD COLUMN "archivedAt" TIMESTAMPTZ(3);
CREATE INDEX "NfcCustomer_restaurantId_archivedAt_idx" ON "NfcCustomer"("restaurantId","archivedAt");
