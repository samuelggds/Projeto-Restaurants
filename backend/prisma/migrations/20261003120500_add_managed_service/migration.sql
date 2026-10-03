INSERT INTO "PlatformPlan"
  ("code", "name", "description", "monthlyFee", "trialDays", "features", "featured", "active", "version", "updatedAt")
VALUES (
  'GESTAO_TOTAL'::"PlanType",
  'Gestão Total',
  'Operação completa com implantação assistida e gestão contínua sob solicitação para o restaurante focar nas vendas.',
  349.90,
  15,
  '[
    "Tudo do Plano Premium",
    "Implantação inicial assistida",
    "Cadastro inicial de produtos, categorias e combos",
    "Configuração visual e operacional inicial",
    "Gestão assistida contínua sob solicitação",
    "Atualizações de produtos, preços, categorias, combos, banners e configurações",
    "Solicitações ilimitadas de atualização dentro da política de uso justo",
    "GastroNexa IA",
    "Cardápio digital com QR Code de mesa",
    "Suporte prioritário"
  ]'::jsonb,
  true,
  true,
  1,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "monthlyFee" = EXCLUDED."monthlyFee",
  "trialDays" = EXCLUDED."trialDays",
  "features" = EXCLUDED."features",
  "featured" = EXCLUDED."featured",
  "active" = EXCLUDED."active",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "PlatformPlan"
SET
  "description" = 'Operação completa com implantação inicial assistida para deixar o restaurante pronto para vender.',
  "features" = '[
    "Sistema de delivery",
    "Cardápio digital com QR Code de mesa",
    "GastroNexa IA com créditos iniciais",
    "Implantação Premium assistida",
    "Configuração inicial do restaurante",
    "Organização inicial do cardápio",
    "Cadastro inicial de até 150 produtos",
    "Categorias e combos configurados",
    "Configuração visual e operacional inicial",
    "Revisão antes da publicação",
    "Suporte prioritário"
  ]'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'PREMIUM'::"PlanType";

UPDATE "PlatformPlan"
SET
  "description" = 'Tudo o que o restaurante precisa para começar a vender online e administrar sua própria operação.',
  "features" = '[
    "Sistema de delivery",
    "Gestão de pedidos",
    "PIX Mercado Pago",
    "Clientes e endereços",
    "Promoções e cupons",
    "Relatórios essenciais",
    "Configuração e cadastro realizados pelo próprio restaurante",
    "Suporte padrão"
  ]'::jsonb,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'BASICO'::"PlanType";

CREATE TABLE "RestaurantImplementation" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'AGUARDANDO_MATERIAL',
  "productLimit" INTEGER NOT NULL DEFAULT 150,
  "notes" VARCHAR(2000),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantImplementation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantImplementation_restaurantId_key" UNIQUE ("restaurantId"),
  CONSTRAINT "RestaurantImplementation_productLimit_check" CHECK ("productLimit" BETWEEN 1 AND 5000),
  CONSTRAINT "RestaurantImplementation_status_check" CHECK (
    "status" IN ('AGUARDANDO_MATERIAL','EM_IMPLANTACAO','AGUARDANDO_CLIENTE','EM_REVISAO','CONCLUIDA','CANCELADA')
  ),
  CONSTRAINT "RestaurantImplementation_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RestaurantManagedUpdateRequest" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "requestedByUserId" INTEGER NOT NULL,
  "handledByUserId" INTEGER,
  "category" VARCHAR(32) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'ABERTA',
  "response" VARCHAR(2000),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RestaurantManagedUpdateRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantManagedUpdateRequest_category_check" CHECK (
    "category" IN ('PRODUTO','PRECO','CATEGORIA','COMBO','BANNER','APARENCIA','CONFIGURACAO','OUTRO')
  ),
  CONSTRAINT "RestaurantManagedUpdateRequest_status_check" CHECK (
    "status" IN ('ABERTA','EM_ANALISE','EM_EXECUCAO','AGUARDANDO_CLIENTE','CONCLUIDA','CANCELADA')
  ),
  CONSTRAINT "RestaurantManagedUpdateRequest_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RestaurantManagedUpdateRequest_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RestaurantManagedUpdateRequest_handledByUserId_fkey"
    FOREIGN KEY ("handledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "RestaurantImplementation_status_createdAt_idx"
  ON "RestaurantImplementation"("status", "createdAt");

CREATE INDEX "RestaurantManagedUpdateRequest_restaurantId_status_createdAt_idx"
  ON "RestaurantManagedUpdateRequest"("restaurantId", "status", "createdAt");

CREATE INDEX "RestaurantManagedUpdateRequest_status_createdAt_idx"
  ON "RestaurantManagedUpdateRequest"("status", "createdAt");

INSERT INTO "RestaurantImplementation"
  ("id", "restaurantId", "status", "productLimit", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  s."restaurantId",
  'AGUARDANDO_MATERIAL',
  150,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Subscription" s
WHERE s."plan" IN ('PREMIUM'::"PlanType", 'GESTAO_TOTAL'::"PlanType")
ON CONFLICT ("restaurantId") DO NOTHING;

INSERT INTO "PlatformPlanPolicy" ("code", "useDefaultTrialDays", "updatedAt")
VALUES ('GESTAO_TOTAL'::"PlanType", false, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "useDefaultTrialDays" = false,
  "updatedAt" = CURRENT_TIMESTAMP;


ALTER TABLE "SalesLead"
DROP CONSTRAINT IF EXISTS "SalesLead_plan_check";

ALTER TABLE "SalesLead"
ADD CONSTRAINT "SalesLead_plan_check"
CHECK ("planInterest" IN ('BASICO', 'PREMIUM', 'GESTAO_TOTAL', 'UNDECIDED'));
