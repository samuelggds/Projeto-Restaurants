-- Assistente gerencial do restaurante: estado privado, auditável e isolado por tenant.
-- A IA nunca recebe permissão direta para escrever nas tabelas de negócio; propostas,
-- aprovações e jobs passam por estas estruturas e por serviços allowlisted do backend.

CREATE TABLE "RestaurantAiAssistantSettings" (
  "restaurantId" INTEGER NOT NULL,
  "autonomyMode" VARCHAR(32) NOT NULL DEFAULT 'SUGGEST_ONLY',
  "automationsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "pendingOrderMinutes" INTEGER NOT NULL DEFAULT 15,
  "preparingOrderMinutes" INTEGER NOT NULL DEFAULT 30,
  "readyOrderMinutes" INTEGER NOT NULL DEFAULT 15,
  "deliveryOrderMinutes" INTEGER NOT NULL DEFAULT 45,
  "stockAlertThreshold" INTEGER NOT NULL DEFAULT 3,
  "minimumForecastOrders" INTEGER NOT NULL DEFAULT 30,
  "maxAiRequestsPerHour" INTEGER NOT NULL DEFAULT 20,
  "maxConcurrentAiJobs" INTEGER NOT NULL DEFAULT 2,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantAiAssistantSettings_pkey" PRIMARY KEY ("restaurantId"),
  CONSTRAINT "RestaurantAiAssistantSettings_restaurant_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RestaurantAiAssistantSettings_updatedBy_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RestaurantAiAssistantSettings_autonomy_check"
    CHECK ("autonomyMode" IN ('SUGGEST_ONLY', 'APPROVAL_REQUIRED', 'BOUNDED_AUTOMATION')),
  CONSTRAINT "RestaurantAiAssistantSettings_thresholds_check" CHECK (
    "pendingOrderMinutes" BETWEEN 1 AND 240 AND
    "preparingOrderMinutes" BETWEEN 1 AND 480 AND
    "readyOrderMinutes" BETWEEN 1 AND 240 AND
    "deliveryOrderMinutes" BETWEEN 1 AND 720 AND
    "stockAlertThreshold" BETWEEN 0 AND 100000 AND
    "minimumForecastOrders" BETWEEN 10 AND 10000 AND
    "maxAiRequestsPerHour" BETWEEN 1 AND 200 AND
    "maxConcurrentAiJobs" BETWEEN 1 AND 10
  )
);

CREATE TABLE "RestaurantAiSnapshot" (
  "id" BIGSERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "cacheKey" VARCHAR(80) NOT NULL,
  "sourceVersion" VARCHAR(160) NOT NULL,
  "payload" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantAiSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantAiSnapshot_restaurant_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RestaurantAiSnapshot_restaurant_cache_key" UNIQUE ("restaurantId", "cacheKey")
);
CREATE INDEX "RestaurantAiSnapshot_expiry_idx" ON "RestaurantAiSnapshot"("expiresAt");

CREATE TABLE "RestaurantAiAction" (
  "id" BIGSERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "actorUserId" INTEGER NOT NULL,
  "actionType" VARCHAR(64) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PROPOSED',
  "proposal" JSONB NOT NULL,
  "approvalSnapshot" JSONB,
  "result" JSONB,
  "error" VARCHAR(1000),
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "approvedByUserId" INTEGER,
  "approvedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantAiAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantAiAction_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "RestaurantAiAction_restaurant_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RestaurantAiAction_actor_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RestaurantAiAction_approvedBy_fkey"
    FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "RestaurantAiAction_restaurant_idempotency_key" UNIQUE ("restaurantId", "idempotencyKey"),
  CONSTRAINT "RestaurantAiAction_status_check"
    CHECK ("status" IN ('PROPOSED', 'APPROVED', 'EXECUTED', 'CANCELED', 'FAILED'))
);
CREATE INDEX "RestaurantAiAction_restaurant_created_idx"
  ON "RestaurantAiAction"("restaurantId", "createdAt" DESC);
CREATE INDEX "RestaurantAiAction_restaurant_status_idx"
  ON "RestaurantAiAction"("restaurantId", "status", "createdAt" DESC);

CREATE TABLE "RestaurantAiJob" (
  "id" BIGSERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "actorUserId" INTEGER NOT NULL,
  "kind" VARCHAR(64) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "error" VARCHAR(1000),
  "estimatedCreditUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "actualCreditUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMP(3),
  "lockToken" UUID,
  "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
  "dedupeKey" VARCHAR(191) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "RestaurantAiJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantAiJob_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "RestaurantAiJob_restaurant_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RestaurantAiJob_actor_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RestaurantAiJob_restaurant_dedupe_key" UNIQUE ("restaurantId", "dedupeKey"),
  CONSTRAINT "RestaurantAiJob_status_check"
    CHECK ("status" IN ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELED')),
  CONSTRAINT "RestaurantAiJob_attempts_check"
    CHECK ("attempts" >= 0 AND "maxAttempts" BETWEEN 1 AND 10),
  CONSTRAINT "RestaurantAiJob_cost_check"
    CHECK ("estimatedCreditUsd" >= 0 AND "actualCreditUsd" >= 0)
);
CREATE INDEX "RestaurantAiJob_claim_idx"
  ON "RestaurantAiJob"("status", "availableAt", "lockedUntil");
CREATE INDEX "RestaurantAiJob_restaurant_created_idx"
  ON "RestaurantAiJob"("restaurantId", "createdAt" DESC);

CREATE TABLE "RestaurantAiJobItem" (
  "id" BIGSERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "jobId" BIGINT NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "entityType" VARCHAR(40) NOT NULL,
  "entityId" VARCHAR(191) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "result" JSONB,
  "error" VARCHAR(1000),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "dedupeKey" VARCHAR(191) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantAiJobItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantAiJobItem_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "RestaurantAiJobItem_job_fkey"
    FOREIGN KEY ("jobId") REFERENCES "RestaurantAiJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RestaurantAiJobItem_restaurant_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RestaurantAiJobItem_job_dedupe_key" UNIQUE ("jobId", "dedupeKey"),
  CONSTRAINT "RestaurantAiJobItem_status_check"
    CHECK ("status" IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED', 'MANUAL_REQUIRED', 'SKIPPED'))
);
CREATE INDEX "RestaurantAiJobItem_job_status_idx"
  ON "RestaurantAiJobItem"("jobId", "status", "id");
CREATE INDEX "RestaurantAiJobItem_restaurant_entity_idx"
  ON "RestaurantAiJobItem"("restaurantId", "entityType", "entityId");

CREATE TABLE "MenuImportDraft" (
  "id" BIGSERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "actorUserId" INTEGER NOT NULL,
  "sourceType" VARCHAR(24) NOT NULL,
  "sourceReference" TEXT,
  "status" VARCHAR(24) NOT NULL DEFAULT 'REVIEW',
  "aiUsage" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  CONSTRAINT "MenuImportDraft_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MenuImportDraft_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "MenuImportDraft_restaurant_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MenuImportDraft_actor_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MenuImportDraft_source_check" CHECK ("sourceType" IN ('IMAGE', 'IFOOD')),
  CONSTRAINT "MenuImportDraft_status_check"
    CHECK ("status" IN ('REVIEW', 'PUBLISHED', 'CANCELED', 'EXPIRED'))
);
CREATE INDEX "MenuImportDraft_restaurant_created_idx"
  ON "MenuImportDraft"("restaurantId", "createdAt" DESC);

CREATE TABLE "MenuImportDraftItem" (
  "id" BIGSERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "draftId" BIGINT NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "sourceCategory" VARCHAR(120),
  "sourceName" VARCHAR(160) NOT NULL,
  "sourceDescription" TEXT,
  "sourcePrice" DECIMAL(10,2),
  "sourceImage" TEXT,
  "confidence" DECIMAL(5,4),
  "uncertainFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "duplicateProductId" INTEGER,
  "action" VARCHAR(16) NOT NULL DEFAULT 'CREATE',
  "selected" BOOLEAN NOT NULL DEFAULT true,
  "reviewedPayload" JSONB,
  "publishedProductId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MenuImportDraftItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MenuImportDraftItem_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "MenuImportDraftItem_draft_fkey"
    FOREIGN KEY ("draftId") REFERENCES "MenuImportDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MenuImportDraftItem_restaurant_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MenuImportDraftItem_duplicate_fkey"
    FOREIGN KEY ("duplicateProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MenuImportDraftItem_published_fkey"
    FOREIGN KEY ("publishedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "MenuImportDraftItem_draft_position_key" UNIQUE ("draftId", "position"),
  CONSTRAINT "MenuImportDraftItem_action_check" CHECK ("action" IN ('CREATE', 'UPDATE', 'SKIP')),
  CONSTRAINT "MenuImportDraftItem_confidence_check"
    CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);
CREATE INDEX "MenuImportDraftItem_draft_idx" ON "MenuImportDraftItem"("draftId", "position");
CREATE INDEX "MenuImportDraftItem_restaurant_duplicate_idx"
  ON "MenuImportDraftItem"("restaurantId", "duplicateProductId");

-- Defesa em profundidade: todas as tabelas privadas do assistente falham fechadas
-- quando app.restaurant_id não foi definido pelo backend autenticado.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'RestaurantAiAssistantSettings',
    'RestaurantAiSnapshot',
    'RestaurantAiAction',
    'RestaurantAiJob',
    'RestaurantAiJobItem',
    'MenuImportDraft',
    'MenuImportDraftItem'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS PERMISSIVE FOR ALL TO PUBLIC USING (
        "restaurantId" = CASE WHEN current_setting(''app.restaurant_id'', true) ~ ''^[1-9][0-9]*$''
          THEN current_setting(''app.restaurant_id'', true)::integer ELSE NULL END
      ) WITH CHECK (
        "restaurantId" = CASE WHEN current_setting(''app.restaurant_id'', true) ~ ''^[1-9][0-9]*$''
          THEN current_setting(''app.restaurant_id'', true)::integer ELSE NULL END
      )',
      table_name || '_tenant_isolation',
      table_name
    );
  END LOOP;
END $$;
