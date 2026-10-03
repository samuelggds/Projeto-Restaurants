UPDATE "PlatformPlan"
SET
  "monthlyFee" = CASE "code"
    WHEN 'BASICO'::"PlanType" THEN 99.90
    WHEN 'PREMIUM'::"PlanType" THEN 199.90
    WHEN 'GESTAO_TOTAL'::"PlanType" THEN 299.90
    ELSE "monthlyFee"
  END,
  "version" = "version" + 1,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN (
  'BASICO'::"PlanType",
  'PREMIUM'::"PlanType",
  'GESTAO_TOTAL'::"PlanType"
);
