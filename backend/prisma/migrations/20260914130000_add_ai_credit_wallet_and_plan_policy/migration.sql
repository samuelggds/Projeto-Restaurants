-- Regras comerciais de trial ficam separadas do texto/benefícios do plano.
-- Planos existentes continuam usando o trial próprio até que o SUPER_ADMIN
-- opte explicitamente por herdar o padrão da plataforma.
CREATE TABLE "PlatformPlanPolicy" (
  "code" "PlanType" NOT NULL,
  "useDefaultTrialDays" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformPlanPolicy_pkey" PRIMARY KEY ("code"),
  CONSTRAINT "PlatformPlanPolicy_code_fkey"
    FOREIGN KEY ("code") REFERENCES "PlatformPlan"("code")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "PlatformPlanPolicy" ("code", "useDefaultTrialDays")
SELECT "code", false FROM "PlatformPlan"
ON CONFLICT ("code") DO NOTHING;

-- Carteira de IA: saldo persistente em micros de dólar. O crédito promocional
-- é concedido no máximo uma vez por restaurante elegível e não renova mensalmente.
CREATE TABLE "AiCreditWallet" (
  "restaurantId" INTEGER NOT NULL,
  "balanceMicros" BIGINT NOT NULL DEFAULT 0,
  "freeGrantClaimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCreditWallet_pkey" PRIMARY KEY ("restaurantId"),
  CONSTRAINT "AiCreditWallet_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiCreditWallet_balance_nonnegative" CHECK ("balanceMicros" >= 0)
);

CREATE TABLE "AiCreditLedgerEntry" (
  "id" BIGSERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "actorUserId" INTEGER,
  "kind" TEXT NOT NULL,
  "amountMicros" BIGINT NOT NULL,
  "balanceAfterMicros" BIGINT NOT NULL,
  "idempotencyKey" VARCHAR(191) NOT NULL,
  "referenceType" VARCHAR(40),
  "referenceId" VARCHAR(191),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCreditLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiCreditLedgerEntry_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiCreditLedgerEntry_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiCreditLedgerEntry_kind_check"
    CHECK ("kind" IN ('FREE_GRANT', 'PURCHASE', 'USAGE', 'ADJUSTMENT')),
  CONSTRAINT "AiCreditLedgerEntry_amount_nonzero" CHECK ("amountMicros" <> 0),
  CONSTRAINT "AiCreditLedgerEntry_balance_nonnegative" CHECK ("balanceAfterMicros" >= 0),
  CONSTRAINT "AiCreditLedgerEntry_idempotencyKey_key" UNIQUE ("idempotencyKey")
);
CREATE INDEX "AiCreditLedgerEntry_restaurant_created_idx"
  ON "AiCreditLedgerEntry"("restaurantId", "createdAt" DESC);

-- A cobrança da recarga é um registro financeiro da plataforma. Ela permanece
-- fora do RLS de tenant, assim como outros artefatos de reconciliação cross-tenant;
-- endpoints autenticados sempre filtram restaurantId e o webhook só credita após
-- consultar e validar a evidência financeira no provedor.
CREATE TABLE "AiCreditTopUp" (
  "id" BIGSERIAL NOT NULL,
  "publicId" VARCHAR(64) NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "requestedByUserId" INTEGER NOT NULL,
  "creditUsdMicros" BIGINT NOT NULL,
  "exchangeRateBrlPerUsd" DECIMAL(14, 6) NOT NULL,
  "exchangeRateSource" VARCHAR(40) NOT NULL,
  "exchangeRateQuotedAt" TIMESTAMP(3) NOT NULL,
  "amountBrl" DECIMAL(12, 2) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "provider" VARCHAR(40) NOT NULL DEFAULT 'MERCADO_PAGO',
  "providerPaymentId" VARCHAR(191),
  "providerOrderId" VARCHAR(191),
  "providerTransactionReference" VARCHAR(191),
  "pixQrCode" TEXT,
  "pixQrCodeBase64" TEXT,
  "pixExpiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failureReason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCreditTopUp_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiCreditTopUp_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "AiCreditTopUp_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AiCreditTopUp_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AiCreditTopUp_credit_positive" CHECK ("creditUsdMicros" > 0),
  CONSTRAINT "AiCreditTopUp_rate_positive" CHECK ("exchangeRateBrlPerUsd" > 0),
  CONSTRAINT "AiCreditTopUp_amount_positive" CHECK ("amountBrl" > 0),
  CONSTRAINT "AiCreditTopUp_method_check" CHECK ("paymentMethod" IN ('PIX', 'CARD')),
  CONSTRAINT "AiCreditTopUp_status_check"
    CHECK ("status" IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED'))
);
CREATE UNIQUE INDEX "AiCreditTopUp_providerPaymentId_key"
  ON "AiCreditTopUp"("providerPaymentId") WHERE "providerPaymentId" IS NOT NULL;
CREATE UNIQUE INDEX "AiCreditTopUp_providerOrderId_key"
  ON "AiCreditTopUp"("providerOrderId") WHERE "providerOrderId" IS NOT NULL;
CREATE INDEX "AiCreditTopUp_restaurant_created_idx"
  ON "AiCreditTopUp"("restaurantId", "createdAt" DESC);
CREATE INDEX "AiCreditTopUp_status_created_idx"
  ON "AiCreditTopUp"("status", "createdAt");

-- O cartão cadastrado para cobrança da plataforma passa a guardar somente o ID
-- do perfil tokenizado do Mercado Pago. Nenhum PAN/CVV é persistido localmente.
ALTER TABLE "PlatformBillingProfile"
  ADD COLUMN IF NOT EXISTS "providerPaymentProfileId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerPreviousTransactionReference" TEXT;

-- Estado operacional do link privado não depende mais do histórico de auditoria.
CREATE TABLE "AdminPortalCredential" (
  "restaurantId" INTEGER NOT NULL,
  "keyHash" CHAR(64) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "rotatedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminPortalCredential_pkey" PRIMARY KEY ("restaurantId"),
  CONSTRAINT "AdminPortalCredential_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AdminPortalCredential_rotatedByUserId_fkey"
    FOREIGN KEY ("rotatedByUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AdminPortalCredential_keyHash_check" CHECK ("keyHash" ~ '^[a-f0-9]{64}$')
);

-- Migra o último link legado ainda válido. A janela de 30 dias evita invalidar
-- silenciosamente um link só porque os eventos antigos serão submetidos à retenção.
WITH latest AS (
  SELECT DISTINCT ON ("restaurantId")
    "restaurantId", "action", "metadata", "userId"
  FROM "AuditLog"
  WHERE "restaurantId" IS NOT NULL
    AND "action" IN ('ADMIN_PORTAL_KEY_ROTATED', 'ADMIN_PORTAL_KEY_REVOKED')
  ORDER BY "restaurantId", "createdAt" DESC, "id" DESC
)
INSERT INTO "AdminPortalCredential" (
  "restaurantId", "keyHash", "expiresAt", "rotatedByUserId"
)
SELECT
  "restaurantId",
  "metadata"->>'keyHash',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  "userId"
FROM latest
WHERE "action" = 'ADMIN_PORTAL_KEY_ROTATED'
  AND COALESCE("metadata"->>'keyHash', '') ~ '^[a-f0-9]{64}$'
ON CONFLICT ("restaurantId") DO NOTHING;

ALTER TABLE "AiCreditWallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiCreditWallet" FORCE ROW LEVEL SECURITY;
CREATE POLICY "AiCreditWallet_tenant_isolation"
ON "AiCreditWallet" AS PERMISSIVE FOR ALL TO PUBLIC
USING (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
)
WITH CHECK (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
);

ALTER TABLE "AiCreditLedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiCreditLedgerEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY "AiCreditLedgerEntry_tenant_isolation"
ON "AiCreditLedgerEntry" AS PERMISSIVE FOR ALL TO PUBLIC
USING (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
)
WITH CHECK (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
);
