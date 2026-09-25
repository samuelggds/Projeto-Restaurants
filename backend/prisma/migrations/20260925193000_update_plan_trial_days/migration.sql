-- Novos trials comerciais por plano.
-- Assinaturas TESTE já criadas mantêm o trialEndsAt persistido e não são encurtadas.
UPDATE "PlatformPlan"
SET "trialDays" = 7,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'BASICO'::"PlanType";

UPDATE "PlatformPlan"
SET "trialDays" = 15,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'PREMIUM'::"PlanType";

-- Os dois planos passam a usar explicitamente o trial próprio do catálogo,
-- evitando que defaultTrialDays global substitua 7/15 dias.
INSERT INTO "PlatformPlanPolicy" ("code", "useDefaultTrialDays", "updatedAt")
SELECT
  plan."code",
  false,
  CURRENT_TIMESTAMP
FROM "PlatformPlan" AS plan
WHERE plan."code" IN ('BASICO'::"PlanType", 'PREMIUM'::"PlanType")
ON CONFLICT ("code") DO UPDATE SET
  "useDefaultTrialDays" = false,
  "updatedAt" = CURRENT_TIMESTAMP;
