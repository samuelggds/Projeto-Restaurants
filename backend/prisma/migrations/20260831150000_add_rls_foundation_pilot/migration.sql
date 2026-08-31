-- RLS foundation, phase 1.
--
-- These two private tables have a direct, NOT NULL restaurantId and no
-- SUPER_ADMIN, public-catalog, webhook or cross-tenant worker requirement.
-- Application-level restaurantId filters remain mandatory; these policies are
-- an additional database boundary.

ALTER TABLE "CustomerPaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerPaymentMethod" FORCE ROW LEVEL SECURITY;

CREATE POLICY "CustomerPaymentMethod_tenant_isolation"
ON "CustomerPaymentMethod"
AS PERMISSIVE
FOR ALL
TO PUBLIC
USING (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
)
WITH CHECK (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
);

ALTER TABLE "OrderIssueThread" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderIssueThread" FORCE ROW LEVEL SECURITY;

CREATE POLICY "OrderIssueThread_tenant_isolation"
ON "OrderIssueThread"
AS PERMISSIVE
FOR ALL
TO PUBLIC
USING (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
)
WITH CHECK (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
);
