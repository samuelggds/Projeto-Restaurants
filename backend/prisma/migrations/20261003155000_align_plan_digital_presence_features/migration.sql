UPDATE "PlatformPlan"
SET
  "features" = CASE
    WHEN "features" @> '["Endereço público GastroNexa com /slug"]'::jsonb
      THEN "features"
    ELSE "features" || '["Endereço público GastroNexa com /slug"]'::jsonb
  END,
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'BASICO'::"PlanType";

UPDATE "PlatformPlan"
SET
  "features" = (
    CASE
      WHEN "features" @> '["Endereço público GastroNexa com /slug"]'::jsonb
        THEN "features"
      ELSE "features" || '["Endereço público GastroNexa com /slug"]'::jsonb
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
    CASE
      WHEN "features" @> '["Endereço público GastroNexa com /slug"]'::jsonb
        THEN "features"
      ELSE "features" || '["Endereço público GastroNexa com /slug"]'::jsonb
    END
  ) || (
    CASE
      WHEN "features" @> '["Domínio próprio opcional com gestão técnica pela GastroNexa"]'::jsonb
        THEN '[]'::jsonb
      ELSE '["Domínio próprio opcional com gestão técnica pela GastroNexa"]'::jsonb
    END
  ) || (
    CASE
      WHEN "features" @> '["Landing page institucional opcional no domínio próprio"]'::jsonb
        THEN '[]'::jsonb
      ELSE '["Landing page institucional opcional no domínio próprio"]'::jsonb
    END
  ),
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'GESTAO_TOTAL'::"PlanType";
