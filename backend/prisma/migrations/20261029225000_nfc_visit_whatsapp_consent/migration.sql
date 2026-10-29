-- Consent evidence is scoped to the generated NFC visit credential, never inferred from a phone number.
ALTER TABLE "NfcComandaAccess"
  ADD COLUMN "whatsappConsentAt" TIMESTAMPTZ(3),
  ADD COLUMN "whatsappConsentByUserId" INTEGER;
