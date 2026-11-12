-- Black Friday commercial simplification: Entrada + Avançado.
-- Persisted PlanType values remain BASICO/PREMIUM for compatibility.
-- GESTAO_TOTAL remains available to already subscribed restaurants, but is
-- disabled for new subscriptions. No invoices or existing subscriptions changed.

UPDATE "PlatformPlan"
SET
  "name" = 'Entrada',
  "description" = 'Delivery, gestão de pedidos e cardápio digital com QR Code de mesa.',
  "monthlyFee" = 79.90,
  "features" = '[
    "Sistema de delivery",
    "Cardápio digital com QR Code de mesa",
    "Gestão de pedidos e mesas",
    "Implantação inicial assistida uma única vez",
    "Cadastro inicial de até 50 produtos, além de categorias, combos, banners e configurações",
    "Após a implantação, o próprio ADMIN gerencia o cardápio e as configurações",
    "Endereço público GastroNexa com /slug",
    "Suporte padrão"
  ]'::jsonb,
  "featured" = false,
  "active" = true,
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'BASICO'::"PlanType";

UPDATE "PlatformPlan"
SET
  "name" = 'Avançado',
  "description" = 'Tudo do Entrada, com NFC, domínio próprio opcional, IA, suporte prioritário e gestão assistida contínua.',
  "monthlyFee" = 149.90,
  "features" = '[
    "Tudo do Plano Entrada",
    "Sistema de delivery",
    "Cardápio digital com QR Code de mesa",
    "Cartões NFC com comandas individuais (sujeito à homologação financeira)",
    "Implantação inicial assistida",
    "Cadastro assistido de produtos, categorias e combos sem limite de quantidade",
    "Gestão assistida contínua, inclusive com atualizações diárias sob solicitação",
    "Atualizações de produtos, preços, categorias, combos, banners e configurações",
    "Endereço público GastroNexa com /slug",
    "Domínio próprio opcional com gestão técnica pela GastroNexa",
    "Página personalizada do restaurante opcional no domínio próprio",
    "Cardápio em subdomínio quando a página personalizada estiver ativa",
    "Solicitações de atualização ilimitadas",
    "Suporte prioritário",
    "GastroNexa IA com US$ 2,00 de créditos iniciais"
  ]'::jsonb,
  "featured" = true,
  "active" = true,
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'PREMIUM'::"PlanType";

UPDATE "PlatformPlan"
SET
  "featured" = false,
  "active" = false,
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'GESTAO_TOTAL'::"PlanType";
