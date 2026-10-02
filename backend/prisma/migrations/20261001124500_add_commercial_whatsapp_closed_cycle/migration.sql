-- Persist the end of a human commercial WhatsApp session so a new bot cycle
-- can start only after the configured cooldown. This migration is additive to
-- remain safe during rolling deployments.
ALTER TABLE "SalesLeadWhatsappConversation"
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "SalesLeadWhatsappConversation_automationMode_closedAt_idx"
  ON "SalesLeadWhatsappConversation" ("automationMode", "closedAt");

-- AWAY was the old outside-hours automatic response. The new policy is silence
-- outside configured hours, so pending legacy responses must never be delivered.
UPDATE "SalesLeadWhatsappOutbox"
SET "status" = 'SUPPRESSED',
    "suppressedReason" = 'outside_hours',
    "lockedUntil" = NULL,
    "lockToken" = NULL
WHERE "status" = 'PENDING'
  AND "kind" = 'AWAY';
