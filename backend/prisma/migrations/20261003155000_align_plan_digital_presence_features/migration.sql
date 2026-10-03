UPDATE "PlatformPlan"
SET
  "features" = CASE
    WHEN ("features" - 'Domínio personalizado configurado pela GastroNexa')
      @> '["Endereço público GastroNexa com /slug"]'::jsonb
      THEN ("features" - 'Domínio personalizado configurado pela GastroNexa')
    ELSE ("features" - 'Domínio personalizado configurado pela GastroNexa')
      || '["Endereço público GastroNexa com /slug"]'::jsonb
  END,
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'BASICO'::"PlanType";

UPDATE "PlatformPlan"
SET
  "features" = (
    CASE
      WHEN ("features" - 'Domínio personalizado configurado pela GastroNexa')
        @> '["Endereço público GastroNexa com /slug"]'::jsonb
        THEN ("features" - 'Domínio personalizado configurado pela GastroNexa')
      ELSE ("features" - 'Domínio personalizado configurado pela GastroNexa')
        || '["Endereço público GastroNexa com /slug"]'::jsonb
    END
  ) || (
    CASE
      WHEN "features" @> '["Domínio próprio opcional configurado pela GastroNexa"]'::jsonb
        THEN '[]'::jsonb
      ELSE '["Domínio próprio opcional configurado pela GastroNexa"]'::jsonb
    END
  ),
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'PREMIUM'::"PlanType";

UPDATE "PlatformPlan"
SET
  "features" = (
    (
      "features"
      - 'Domínio personalizado com gestão técnica pela GastroNexa'
      - 'Site oficial no domínio próprio com cardápio em subdomínio, quando contratado'
      - 'Landing page institucional opcional no domínio próprio'
      - 'Cardápio em subdomínio quando a landing estiver ativa'
    )
  ) || (
    CASE
      WHEN "features" @> '["Endereço público GastroNexa com /slug"]'::jsonb
        THEN '[]'::jsonb
      ELSE '["Endereço público GastroNexa com /slug"]'::jsonb
    END
  ) || (
    CASE
      WHEN "features" @> '["Domínio próprio opcional com gestão técnica pela GastroNexa"]'::jsonb
        THEN '[]'::jsonb
      ELSE '["Domínio próprio opcional com gestão técnica pela GastroNexa"]'::jsonb
    END
  ) || (
    CASE
      WHEN "features" @> '["Página personalizada do restaurante opcional no domínio próprio"]'::jsonb
        THEN '[]'::jsonb
      ELSE '["Página personalizada do restaurante opcional no domínio próprio"]'::jsonb
    END
  ) || (
    CASE
      WHEN "features" @> '["Cardápio em subdomínio quando a página personalizada estiver ativa"]'::jsonb
        THEN '[]'::jsonb
      ELSE '["Cardápio em subdomínio quando a página personalizada estiver ativa"]'::jsonb
    END
  ),
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'GESTAO_TOTAL'::"PlanType";
