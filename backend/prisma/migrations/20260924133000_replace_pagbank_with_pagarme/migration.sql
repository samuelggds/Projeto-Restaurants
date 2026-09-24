-- Expand phase: add Pagar.me credentials for future activation.
-- PagBank runtime support is removed, but its physical columns are intentionally
-- retained until a later contract migration approved by the migration policy.

ALTER TABLE "RestaurantSettings"
  ADD COLUMN "pagarmeSecretKey" TEXT,
  ADD COLUMN "pagarmePublicKey" TEXT,
  ADD COLUMN "pagarmeEnvironment" TEXT;
