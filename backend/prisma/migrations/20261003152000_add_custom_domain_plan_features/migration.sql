UPDATE "PlatformPlan"
SET
  "features" = CASE
    WHEN "features" @> '["Domínio personalizado configurado pela GastroNexa"]'::jsonb
      THEN "features"
    ELSE "features" || '["Domínio personalizado configurado pela GastroNexa"]'::jsonb
  END,
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'PREMIUM'::"PlanType";

UPDATE "PlatformPlan"
SET
  "features" = (
    CASE
      WHEN "features" @> '["Domínio personalizado com gestão técnica pela GastroNexa"]'::jsonb
        THEN "features"
      ELSE "features" || '["Domínio personalizado com gestão técnica pela GastroNexa"]'::jsonb
    END
  ) || (
    CASE
      WHEN "features" @> '["Site oficial no domínio próprio com cardápio em subdomínio, quando contratado"]'::jsonb
        THEN '[]'::jsonb
      ELSE '["Site oficial no domínio próprio com cardápio em subdomínio, quando contratado"]'::jsonb
    END
  ),
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'GESTAO_TOTAL'::"PlanType";
