-- A timestamp is set only for customer-requested handoffs during human support hours.
-- Super Admin takeover leaves it NULL, preventing automatic AI resumption.
ALTER TABLE "SalesLeadWhatsappConversation"
  ADD COLUMN "handoffRequestedAt" TIMESTAMPTZ(3);

CREATE INDEX "SalesLeadWhatsappConversation_automationMode_handoffRequestedAt_idx"
  ON "SalesLeadWhatsappConversation"("automationMode", "handoffRequestedAt");
