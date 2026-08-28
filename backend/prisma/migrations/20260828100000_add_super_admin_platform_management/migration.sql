-- Persisted platform settings intentionally exclude credentials and secrets.
CREATE TABLE "PlatformSettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "platformName" TEXT NOT NULL DEFAULT 'S&C Platform',
  "platformDomain" TEXT NOT NULL DEFAULT 'app.scplatform.com.br',
  "supportEmail" TEXT NOT NULL DEFAULT 'suporte@scplatform.com.br',
  "primaryColor" TEXT NOT NULL DEFAULT '#E9530B',
  "locale" TEXT NOT NULL DEFAULT 'pt-BR',
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "dateFormat" TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
  "allowRestaurantSignup" BOOLEAN NOT NULL DEFAULT false,
  "requireManualApproval" BOOLEAN NOT NULL DEFAULT true,
  "defaultTrialDays" INTEGER NOT NULL DEFAULT 30,
  "auditRetentionDays" INTEGER NOT NULL DEFAULT 180,
  "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
  "maintenanceMessage" TEXT NOT NULL DEFAULT 'Plataforma temporariamente em manutencao.',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlatformSettings_singleton_check" CHECK ("id" = 1),
  CONSTRAINT "PlatformSettings_trial_days_check" CHECK ("defaultTrialDays" BETWEEN 0 AND 90),
  CONSTRAINT "PlatformSettings_retention_days_check" CHECK ("auditRetentionDays" BETWEEN 90 AND 3650)
);

INSERT INTO "PlatformSettings" ("id") VALUES (1);

CREATE TABLE "PlatformPlan" (
  "code" "PlanType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "monthlyFee" DECIMAL(10,2) NOT NULL,
  "trialDays" INTEGER NOT NULL DEFAULT 30,
  "features" JSONB NOT NULL,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformPlan_pkey" PRIMARY KEY ("code"),
  CONSTRAINT "PlatformPlan_monthly_fee_check" CHECK ("monthlyFee" >= 0 AND "monthlyFee" <= 100000),
  CONSTRAINT "PlatformPlan_trial_days_check" CHECK ("trialDays" BETWEEN 0 AND 90)
);

INSERT INTO "PlatformPlan"
  ("code", "name", "description", "monthlyFee", "trialDays", "features", "featured", "active")
VALUES
  (
    'BASICO',
    'Basico',
    'Operacao de delivery para restaurantes que estao iniciando na plataforma.',
    149.90,
    30,
    '["Sistema de delivery", "Suporte padrao"]'::jsonb,
    false,
    true
  ),
  (
    'PREMIUM',
    'Premium',
    'Experiencia completa com delivery e atendimento por QR Code nas mesas.',
    249.90,
    30,
    '["Sistema de delivery", "Cardapio digital com QR Code de mesa", "Suporte prioritario"]'::jsonb,
    true,
    true
  );

ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "AuditLog"
  ADD COLUMN "requestId" TEXT,
  ADD COLUMN "userAgent" TEXT,
  ADD COLUMN "metadata" JSONB;

CREATE INDEX "User_role_active_restaurantId_idx" ON "User"("role", "active", "restaurantId");
CREATE INDEX "AuditLog_restaurantId_createdAt_idx" ON "AuditLog"("restaurantId", "createdAt");
CREATE INDEX "SupportChatMessage_restaurantId_senderRole_sentAt_idx"
  ON "SupportChatMessage"("restaurantId", "senderRole", "sentAt");
