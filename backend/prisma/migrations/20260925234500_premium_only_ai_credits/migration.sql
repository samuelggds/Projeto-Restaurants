-- IA e o crédito inicial passam a ser benefícios exclusivos do plano Premium.
-- Não remove saldo/histórico existente de restaurantes que eventualmente façam downgrade.
UPDATE "PlatformPlan"
SET
  "features" = CASE
    WHEN jsonb_typeof("features") = 'array'
      AND NOT ("features" @> '["GastroNexa IA com US$ 2,00 de créditos iniciais"]'::jsonb)
    THEN "features" || '["GastroNexa IA com US$ 2,00 de créditos iniciais"]'::jsonb
    ELSE "features"
  END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'PREMIUM'::"PlanType";
