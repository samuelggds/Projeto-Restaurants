-- Platform commercial WhatsApp configuration and durable conversation queues.

ALTER TABLE "PlatformSettings"
  ADD COLUMN IF NOT EXISTS "commercialWhatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "commercialWhatsappHours" JSONB,
  ADD COLUMN IF NOT EXISTS "commercialWhatsappAwayMessage" TEXT NOT NULL DEFAULT 'Olá! 👋 Obrigado por entrar em contato com a GastroNexa. No momento estamos fora do horário de atendimento humano. Sua mensagem ficou registrada e será retomada no próximo horário de atendimento.';

CREATE TABLE IF NOT EXISTS "PlatformWhatsappConnection" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "provider" VARCHAR(24) NOT NULL DEFAULT 'EVOLUTION',
  "externalInstanceId" VARCHAR(191) NOT NULL UNIQUE,
  "instanceTokenCiphertext" TEXT NOT NULL,
  "webhookSecretHash" VARCHAR(64) NOT NULL,
  "phone" VARCHAR(15),
  "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  "connectedAt" TIMESTAMPTZ(3),
  "disconnectedAt" TIMESTAMPTZ(3),
  "lastWebhookAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SalesLeadWhatsappConversation" (
  "id" UUID PRIMARY KEY,
  "phone" VARCHAR(15) NOT NULL UNIQUE,
  "automationMode" VARCHAR(24) NOT NULL DEFAULT 'BOT',
  "lastInboundAt" TIMESTAMPTZ(3),
  "lastOutboundAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SalesLeadWhatsappConversation_automationMode_updatedAt_idx"
  ON "SalesLeadWhatsappConversation" ("automationMode", "updatedAt");

CREATE TABLE IF NOT EXISTS "SalesLeadWhatsappMessage" (
  "id" UUID PRIMARY KEY,
  "conversationId" UUID NOT NULL,
  "leadId" UUID,
  "direction" VARCHAR(8) NOT NULL,
  "kind" VARCHAR(32) NOT NULL,
  "body" VARCHAR(4000) NOT NULL,
  "providerMessageId" VARCHAR(191) UNIQUE,
  "automated" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesLeadWhatsappMessage_conversation_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "SalesLeadWhatsappConversation"("id") ON DELETE CASCADE,
  CONSTRAINT "SalesLeadWhatsappMessage_lead_fkey"
    FOREIGN KEY ("leadId") REFERENCES "SalesLead"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "SalesLeadWhatsappMessage_conversationId_createdAt_idx"
  ON "SalesLeadWhatsappMessage" ("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "SalesLeadWhatsappMessage_leadId_createdAt_idx"
  ON "SalesLeadWhatsappMessage" ("leadId", "createdAt");

CREATE TABLE IF NOT EXISTS "SalesLeadWhatsappOutbox" (
  "id" UUID PRIMARY KEY,
  "conversationId" UUID NOT NULL,
  "leadId" UUID UNIQUE,
  "deduplicationKey" VARCHAR(64) NOT NULL UNIQUE,
  "kind" VARCHAR(32) NOT NULL,
  "body" VARCHAR(4000) NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMPTZ(3),
  "lockToken" UUID,
  "sentAt" TIMESTAMPTZ(3),
  "suppressedReason" VARCHAR(64),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesLeadWhatsappOutbox_conversation_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "SalesLeadWhatsappConversation"("id") ON DELETE CASCADE,
  CONSTRAINT "SalesLeadWhatsappOutbox_lead_fkey"
    FOREIGN KEY ("leadId") REFERENCES "SalesLead"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "SalesLeadWhatsappOutbox_status_availableAt_idx"
  ON "SalesLeadWhatsappOutbox" ("status", "availableAt");
CREATE INDEX IF NOT EXISTS "SalesLeadWhatsappOutbox_conversationId_sentAt_idx"
  ON "SalesLeadWhatsappOutbox" ("conversationId", "sentAt");
