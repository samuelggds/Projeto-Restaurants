-- Persist a shared, platform-wide 15s send slot across workers.
ALTER TABLE "PlatformWhatsappConnection"
  ADD COLUMN IF NOT EXISTS "nextAutomaticSendAt" TIMESTAMPTZ(3);
