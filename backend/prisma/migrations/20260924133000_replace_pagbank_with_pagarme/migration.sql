-- Expand first: add Pagar.me credentials without dropping legacy PagBank columns.
-- Legacy columns are removed only in a later cleanup after all historical payments are reconciled.

ALTER TABLE "RestaurantSettings"
  ADD COLUMN "pagarmeSecretKey" TEXT,
  ADD COLUMN "pagarmePublicKey" TEXT,
  ADD COLUMN "pagarmeEnvironment" TEXT;
