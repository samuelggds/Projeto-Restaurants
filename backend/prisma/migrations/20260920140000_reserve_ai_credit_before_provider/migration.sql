-- Reservations are holds, not charges. No automatic expiration: a timed-out
-- provider request can still be billed and must be reconciled before release.
CREATE TABLE "AiCreditReservation" (
  "id" UUID PRIMARY KEY,
  "adminUserId" INTEGER NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "feature" VARCHAR(80) NOT NULL,
  "model" VARCHAR(80) NOT NULL,
  "reservedMicros" BIGINT NOT NULL CHECK ("reservedMicros" > 0),
  "chargedMicros" BIGINT CHECK ("chargedMicros" >= 0),
  "status" TEXT NOT NULL DEFAULT 'HELD' CHECK ("status" IN ('HELD', 'UNCERTAIN', 'SETTLED', 'RELEASED')),
  "providerRequestId" VARCHAR(191),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("adminUserId", "restaurantId") REFERENCES "User"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AiCreditReservation_one_active_per_admin" ON "AiCreditReservation" ("adminUserId") WHERE "status" IN ('HELD', 'UNCERTAIN');
CREATE INDEX "AiCreditReservation_tenant_created" ON "AiCreditReservation" ("restaurantId", "createdAt");
ALTER TABLE "AiCreditReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiCreditReservation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "AiCreditReservation_tenant_isolation" ON "AiCreditReservation"
FOR ALL TO PUBLIC USING (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END
) WITH CHECK (
  "restaurantId" = CASE WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
    THEN current_setting('app.restaurant_id', true)::integer ELSE NULL END
);
