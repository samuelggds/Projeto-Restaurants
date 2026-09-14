-- Platform records: no restaurant ownership and no changes to tenant RLS policies.
CREATE TABLE "SalesLead" (
  "id" UUID NOT NULL,
  "idempotencyKey" UUID NOT NULL,
  "payloadHash" VARCHAR(64) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "restaurantName" VARCHAR(160) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "phone" VARCHAR(15) NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "state" VARCHAR(2) NOT NULL,
  "businessType" VARCHAR(80) NOT NULL,
  "channels" TEXT[] NOT NULL,
  "planInterest" VARCHAR(16) NOT NULL,
  "message" VARCHAR(2000),
  "consent" BOOLEAN NOT NULL,
  "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" VARCHAR(16) NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesLead_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesLead_consent_check" CHECK ("consent" = true),
  CONSTRAINT "SalesLead_status_check" CHECK ("status" IN ('NEW', 'CONTACTED', 'ARCHIVED')),
  CONSTRAINT "SalesLead_plan_check" CHECK ("planInterest" IN ('BASICO', 'PREMIUM', 'UNDECIDED')),
  CONSTRAINT "SalesLead_channels_check" CHECK (cardinality("channels") BETWEEN 1 AND 3 AND "channels" <@ ARRAY['DELIVERY', 'TABLE', 'PICKUP']::text[])
);
CREATE UNIQUE INDEX "SalesLead_idempotencyKey_key" ON "SalesLead"("idempotencyKey");
CREATE INDEX "SalesLead_status_createdAt_id_idx" ON "SalesLead"("status", "createdAt", "id");
CREATE INDEX "SalesLead_createdAt_id_idx" ON "SalesLead"("createdAt", "id");

CREATE TABLE "SalesLeadEmailOutbox" (
  "id" UUID NOT NULL,
  "leadId" UUID NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMP(3),
  "lockToken" UUID,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesLeadEmailOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesLeadEmailOutbox_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "SalesLead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SalesLeadEmailOutbox_status_check" CHECK ("status" IN ('PENDING', 'SENT', 'FAILED')),
  CONSTRAINT "SalesLeadEmailOutbox_attempts_check" CHECK ("attempts" >= 0)
);
CREATE UNIQUE INDEX "SalesLeadEmailOutbox_leadId_key" ON "SalesLeadEmailOutbox"("leadId");
CREATE INDEX "SalesLeadEmailOutbox_status_availableAt_idx" ON "SalesLeadEmailOutbox"("status", "availableAt");
