-- Additive preparation for the future NFC card / QR Code attendance modes.
-- All existing restaurants retain the current QR Code behavior.
CREATE TYPE "InPersonServiceMode" AS ENUM ('QR_ONLY', 'NFC_ONLY', 'BOTH');
ALTER TABLE "RestaurantSettings"
  ADD COLUMN "inPersonServiceMode" "InPersonServiceMode" NOT NULL DEFAULT 'QR_ONLY';
