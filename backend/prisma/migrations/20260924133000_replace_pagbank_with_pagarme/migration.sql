-- Add Pagar.me credentials for future activation and remove obsolete PagBank credentials.
-- Pagar.me remains disabled at runtime until the platform enables the CNPJ-based integration.

ALTER TABLE "RestaurantSettings"
  ADD COLUMN "pagarmeSecretKey" TEXT,
  ADD COLUMN "pagarmePublicKey" TEXT,
  ADD COLUMN "pagarmeEnvironment" TEXT;

ALTER TABLE "RestaurantSettings"
  DROP COLUMN IF EXISTS "pagbankEmail",
  DROP COLUMN IF EXISTS "pagbankToken",
  DROP COLUMN IF EXISTS "pagbankRefreshToken",
  DROP COLUMN IF EXISTS "pagbankTokenExpiresAt",
  DROP COLUMN IF EXISTS "pagbankEnvironment";
