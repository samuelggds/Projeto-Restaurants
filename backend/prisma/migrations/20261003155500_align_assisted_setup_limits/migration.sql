ALTER TABLE "RestaurantImplementation"
ALTER COLUMN "productLimit" DROP DEFAULT;

INSERT INTO "RestaurantImplementation"
  ("id", "restaurantId", "status", "productLimit", "createdAt", "updatedAt")
SELECT
  md5('gastronexa:restaurant-implementation:' || s."restaurantId"::text)::uuid,
  s."restaurantId",
  'AGUARDANDO_MATERIAL',
  CASE
    WHEN s."plan" = 'BASICO'::"PlanType" THEN 50
    WHEN s."plan" = 'PREMIUM'::"PlanType" THEN 100
    ELSE NULL
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Subscription" s
WHERE
  s."plan" IN ('BASICO'::"PlanType", 'PREMIUM'::"PlanType", 'GESTAO_TOTAL'::"PlanType")
  AND s."status" IN ('ATIVA'::"SubscriptionStatus", 'TESTE'::"SubscriptionStatus")
ON CONFLICT ("restaurantId") DO NOTHING;

UPDATE "RestaurantImplementation" ri
SET
  "productLimit" = CASE
    WHEN s."plan" = 'BASICO'::"PlanType" THEN 50
    WHEN s."plan" = 'PREMIUM'::"PlanType" THEN 100
    WHEN s."plan" = 'GESTAO_TOTAL'::"PlanType" THEN NULL
    ELSE ri."productLimit"
  END,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Subscription" s
WHERE s."restaurantId" = ri."restaurantId"
  AND s."plan" IN ('BASICO'::"PlanType", 'PREMIUM'::"PlanType", 'GESTAO_TOTAL'::"PlanType");

UPDATE "PlatformPlan"
SET
  "features" = jsonb_build_array(
    'Sistema de delivery',
    'Implantação inicial assistida uma única vez',
    'Cadastro inicial de até 50 produtos, além de categorias, combos, banners e configurações',
    'Após a implantação, o próprio ADMIN gerencia o cardápio e as configurações',
    'Endereço público GastroNexa com /slug',
    'Suporte padrão'
  ),
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'BASICO'::"PlanType";

UPDATE "PlatformPlan"
SET
  "features" = (
    "features"
    - 'Cadastro inicial de até 150 produtos'
    - 'Cadastro inicial de até 100 produtos'
  ) || '["Cadastro inicial de até 100 produtos"]'::jsonb,
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'PREMIUM'::"PlanType";
