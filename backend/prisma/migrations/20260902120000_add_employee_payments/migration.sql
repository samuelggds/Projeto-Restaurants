ALTER TYPE "FuncionarioSubRole" ADD VALUE IF NOT EXISTS 'ATENDENTE';

CREATE TYPE "EmployeeCompensationBaseModel" AS ENUM (
  'NONE',
  'FIXED_MONTHLY',
  'HOURLY'
);

CREATE TYPE "EmployeeCompensationVariableModel" AS ENUM (
  'NONE',
  'SERVICE_FEE_PERCENTAGE',
  'FIXED_PER_TABLE',
  'TABLE_SALES_PERCENTAGE'
);

CREATE TYPE "EmployeeCompensationProrationMode" AS ENUM ('NONE', 'CALENDAR_DAYS');
CREATE TYPE "EmployeeWorkEntryStatus" AS ENUM ('DRAFT', 'APPROVED', 'CANCELED');

CREATE TYPE "EmployeeEarningType" AS ENUM (
  'FIXED_MONTHLY',
  'HOURLY',
  'WAITER_SERVICE_FEE',
  'WAITER_TABLE_FIXED',
  'WAITER_TABLE_SALES',
  'BONUS',
  'DEDUCTION',
  'ADVANCE',
  'CORRECTION',
  'REFUND_REVERSAL'
);

CREATE TYPE "EmployeeEarningDirection" AS ENUM ('CREDIT', 'DEBIT');

CREATE TYPE "EmployeeEarningSourceType" AS ENUM (
  'MONTHLY_BASE',
  'WORK_ENTRY',
  'TABLE_SESSION',
  'MANUAL_ADJUSTMENT',
  'REFUND_REVERSAL'
);

CREATE TYPE "EmployeeSettlementStatus" AS ENUM (
  'DRAFT',
  'CONFIRMED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELED'
);

CREATE TYPE "EmployeeSettlementPaymentMethod" AS ENUM (
  'PIX',
  'CASH',
  'BANK_TRANSFER',
  'OTHER'
);

CREATE TYPE "EmployeeSettlementPaymentStatus" AS ENUM ('ACTIVE', 'REVERSED');

CREATE UNIQUE INDEX "User_id_restaurantId_key"
ON "User"("id", "restaurantId");

CREATE TABLE "EmployeeCompensationPolicy" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "employeeId" INTEGER NOT NULL,
  "baseModel" "EmployeeCompensationBaseModel" NOT NULL DEFAULT 'NONE',
  "fixedMonthlyCents" BIGINT,
  "hourlyRateCents" BIGINT,
  "variableModel" "EmployeeCompensationVariableModel" NOT NULL DEFAULT 'NONE',
  "variableBasisPoints" INTEGER,
  "fixedPerTableCents" BIGINT,
  "prorationMode" "EmployeeCompensationProrationMode" NOT NULL DEFAULT 'NONE',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveUntil" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeCompensationPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeCompensationPolicy_version_check" CHECK ("version" > 0),
  CONSTRAINT "EmployeeCompensationPolicy_dates_check" CHECK (
    "effectiveUntil" IS NULL OR "effectiveUntil" > "effectiveFrom"
  ),
  CONSTRAINT "EmployeeCompensationPolicy_base_check" CHECK (
    ("baseModel" = 'NONE' AND "fixedMonthlyCents" IS NULL AND "hourlyRateCents" IS NULL)
    OR ("baseModel" = 'FIXED_MONTHLY' AND "fixedMonthlyCents" IS NOT NULL AND "fixedMonthlyCents" >= 0 AND "hourlyRateCents" IS NULL)
    OR ("baseModel" = 'HOURLY' AND "hourlyRateCents" IS NOT NULL AND "hourlyRateCents" >= 0 AND "fixedMonthlyCents" IS NULL)
  ),
  CONSTRAINT "EmployeeCompensationPolicy_variable_check" CHECK (
    ("variableModel" = 'NONE' AND "variableBasisPoints" IS NULL AND "fixedPerTableCents" IS NULL)
    OR ("variableModel" IN ('SERVICE_FEE_PERCENTAGE', 'TABLE_SALES_PERCENTAGE') AND "variableBasisPoints" BETWEEN 0 AND 10000 AND "fixedPerTableCents" IS NULL)
    OR ("variableModel" = 'FIXED_PER_TABLE' AND "fixedPerTableCents" IS NOT NULL AND "fixedPerTableCents" > 0 AND "variableBasisPoints" IS NULL)
  ),
  CONSTRAINT "EmployeeCompensationPolicy_proration_check" CHECK (
    "baseModel" = 'FIXED_MONTHLY' OR "prorationMode" = 'NONE'
  )
);

CREATE TABLE "TableWaiterAssignment" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "tableSessionId" INTEGER NOT NULL,
  "waiterId" INTEGER NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unassignedAt" TIMESTAMP(3),
  "assignedById" INTEGER NOT NULL,
  "reason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TableWaiterAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TableWaiterAssignment_dates_check" CHECK (
    "unassignedAt" IS NULL OR "unassignedAt" >= "assignedAt"
  )
);

CREATE TABLE "EmployeeWorkEntry" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "employeeId" INTEGER NOT NULL,
  "workDate" DATE NOT NULL,
  "minutesWorked" INTEGER NOT NULL,
  "status" "EmployeeWorkEntryStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" INTEGER NOT NULL,
  "approvedById" INTEGER,
  "approvedAt" TIMESTAMP(3),
  "canceledById" INTEGER,
  "canceledAt" TIMESTAMP(3),
  "cancelReason" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeWorkEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeWorkEntry_minutes_check" CHECK ("minutesWorked" BETWEEN 1 AND 1440),
  CONSTRAINT "EmployeeWorkEntry_version_check" CHECK ("version" > 0),
  CONSTRAINT "EmployeeWorkEntry_status_check" CHECK (
    ("status" = 'DRAFT' AND "approvedById" IS NULL AND "approvedAt" IS NULL AND "canceledAt" IS NULL)
    OR ("status" = 'APPROVED' AND "approvedById" IS NOT NULL AND "approvedAt" IS NOT NULL AND "canceledAt" IS NULL)
    OR ("status" = 'CANCELED' AND "canceledById" IS NOT NULL AND "canceledAt" IS NOT NULL AND length(btrim("cancelReason")) > 0)
  )
);

CREATE TABLE "EmployeeEarning" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "employeeId" INTEGER NOT NULL,
  "type" "EmployeeEarningType" NOT NULL,
  "direction" "EmployeeEarningDirection" NOT NULL,
  "amountCents" BIGINT NOT NULL,
  "sourceType" "EmployeeEarningSourceType" NOT NULL,
  "sourceId" VARCHAR(191) NOT NULL,
  "sourcePublicId" VARCHAR(191),
  "idempotencyKeyHash" VARCHAR(64),
  "requestFingerprint" VARCHAR(64),
  "policyId" INTEGER,
  "policyVersion" INTEGER,
  "financialBaseCents" BIGINT,
  "appliedBasisPoints" INTEGER,
  "tableSessionId" INTEGER,
  "paymentIntentId" INTEGER,
  "reversesEarningId" INTEGER,
  "snapshot" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "settledAt" TIMESTAMP(3),
  "createdById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeEarning_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeEarning_amount_check" CHECK ("amountCents" > 0),
  CONSTRAINT "EmployeeEarning_basis_points_check" CHECK (
    "appliedBasisPoints" IS NULL OR "appliedBasisPoints" BETWEEN 0 AND 10000
  ),
  CONSTRAINT "EmployeeEarning_policy_snapshot_check" CHECK (
    ("policyId" IS NULL AND "policyVersion" IS NULL)
    OR ("policyId" IS NOT NULL AND "policyVersion" IS NOT NULL AND "policyVersion" > 0)
  ),
  CONSTRAINT "EmployeeEarning_payment_session_check" CHECK (
    "paymentIntentId" IS NULL OR "tableSessionId" IS NOT NULL
  ),
  CONSTRAINT "EmployeeEarning_idempotency_check" CHECK (
    ("idempotencyKeyHash" IS NULL AND "requestFingerprint" IS NULL)
    OR ("idempotencyKeyHash" IS NOT NULL AND "requestFingerprint" IS NOT NULL)
  )
);

CREATE TABLE "EmployeeSettlement" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "employeeId" INTEGER NOT NULL,
  "periodYear" INTEGER NOT NULL,
  "periodMonth" INTEGER NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "EmployeeSettlementStatus" NOT NULL DEFAULT 'DRAFT',
  "grossCreditsCents" BIGINT NOT NULL DEFAULT 0,
  "grossDebitsCents" BIGINT NOT NULL DEFAULT 0,
  "totalDueCents" BIGINT NOT NULL DEFAULT 0,
  "confirmedAt" TIMESTAMP(3),
  "confirmedById" INTEGER,
  "paidAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "canceledById" INTEGER,
  "cancelReason" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeSettlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeSettlement_period_check" CHECK (
    "periodYear" BETWEEN 2000 AND 9999 AND "periodMonth" BETWEEN 1 AND 12 AND "periodEnd" > "periodStart"
  ),
  CONSTRAINT "EmployeeSettlement_totals_check" CHECK (
    "grossCreditsCents" >= 0 AND "grossDebitsCents" >= 0 AND "totalDueCents" >= 0
    AND "totalDueCents" = "grossCreditsCents" - "grossDebitsCents"
  ),
  CONSTRAINT "EmployeeSettlement_version_check" CHECK ("version" > 0),
  CONSTRAINT "EmployeeSettlement_confirmation_check" CHECK (
    "status" = 'DRAFT' OR "confirmedAt" IS NOT NULL OR "status" = 'CANCELED'
  ),
  CONSTRAINT "EmployeeSettlement_cancellation_check" CHECK (
    "status" <> 'CANCELED' OR ("canceledAt" IS NOT NULL AND "canceledById" IS NOT NULL AND length(btrim("cancelReason")) > 0)
  )
);

CREATE TABLE "EmployeeSettlementItem" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "settlementId" INTEGER NOT NULL,
  "earningId" INTEGER NOT NULL,
  "typeSnapshot" "EmployeeEarningType" NOT NULL,
  "directionSnapshot" "EmployeeEarningDirection" NOT NULL,
  "amountCentsSnapshot" BIGINT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeSettlementItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeSettlementItem_amount_check" CHECK ("amountCentsSnapshot" > 0),
  CONSTRAINT "EmployeeSettlementItem_release_check" CHECK (
    ("active" = true AND "releasedAt" IS NULL) OR ("active" = false AND "releasedAt" IS NOT NULL)
  )
);

CREATE TABLE "EmployeeSettlementPayment" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "restaurantId" INTEGER NOT NULL,
  "settlementId" INTEGER NOT NULL,
  "employeeId" INTEGER NOT NULL,
  "amountCents" BIGINT NOT NULL,
  "method" "EmployeeSettlementPaymentMethod" NOT NULL,
  "reference" VARCHAR(191),
  "notes" VARCHAR(500),
  "status" "EmployeeSettlementPaymentStatus" NOT NULL DEFAULT 'ACTIVE',
  "idempotencyKeyHash" VARCHAR(64) NOT NULL,
  "requestFingerprint" VARCHAR(64) NOT NULL,
  "registeredById" INTEGER NOT NULL,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversedAt" TIMESTAMP(3),
  "reversedById" INTEGER,
  "reverseReason" VARCHAR(500),
  "version" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "EmployeeSettlementPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeSettlementPayment_amount_check" CHECK ("amountCents" > 0),
  CONSTRAINT "EmployeeSettlementPayment_version_check" CHECK ("version" > 0),
  CONSTRAINT "EmployeeSettlementPayment_reversal_check" CHECK (
    ("status" = 'ACTIVE' AND "reversedAt" IS NULL AND "reversedById" IS NULL AND "reverseReason" IS NULL)
    OR ("status" = 'REVERSED' AND "reversedAt" IS NOT NULL AND "reversedById" IS NOT NULL AND length(btrim("reverseReason")) > 0)
  )
);

CREATE UNIQUE INDEX "EmployeeCompensationPolicy_publicId_key" ON "EmployeeCompensationPolicy"("publicId");
CREATE UNIQUE INDEX "EmployeeCompensationPolicy_id_restaurantId_key" ON "EmployeeCompensationPolicy"("id", "restaurantId");
CREATE UNIQUE INDEX "EmployeeCompensationPolicy_restaurantId_employeeId_version_key" ON "EmployeeCompensationPolicy"("restaurantId", "employeeId", "version");
CREATE UNIQUE INDEX "EmployeeCompensationPolicy_one_active_per_employee_idx" ON "EmployeeCompensationPolicy"("restaurantId", "employeeId") WHERE "active" = true;
CREATE INDEX "EmployeeCompensationPolicy_restaurantId_employeeId_active_effectiveFrom_idx" ON "EmployeeCompensationPolicy"("restaurantId", "employeeId", "active", "effectiveFrom");
CREATE INDEX "EmployeeCompensationPolicy_restaurantId_effectiveFrom_effectiveUntil_idx" ON "EmployeeCompensationPolicy"("restaurantId", "effectiveFrom", "effectiveUntil");

CREATE UNIQUE INDEX "TableWaiterAssignment_publicId_key" ON "TableWaiterAssignment"("publicId");
CREATE UNIQUE INDEX "TableWaiterAssignment_id_restaurantId_key" ON "TableWaiterAssignment"("id", "restaurantId");
CREATE UNIQUE INDEX "TableWaiterAssignment_one_active_per_session_idx" ON "TableWaiterAssignment"("restaurantId", "tableSessionId") WHERE "unassignedAt" IS NULL;
CREATE INDEX "TableWaiterAssignment_restaurantId_tableSessionId_assignedAt_idx" ON "TableWaiterAssignment"("restaurantId", "tableSessionId", "assignedAt");
CREATE INDEX "TableWaiterAssignment_restaurantId_waiterId_unassignedAt_idx" ON "TableWaiterAssignment"("restaurantId", "waiterId", "unassignedAt");

CREATE UNIQUE INDEX "EmployeeWorkEntry_publicId_key" ON "EmployeeWorkEntry"("publicId");
CREATE UNIQUE INDEX "EmployeeWorkEntry_id_restaurantId_key" ON "EmployeeWorkEntry"("id", "restaurantId");
CREATE UNIQUE INDEX "EmployeeWorkEntry_one_current_per_employee_day_idx" ON "EmployeeWorkEntry"("restaurantId", "employeeId", "workDate") WHERE "status" <> 'CANCELED';
CREATE INDEX "EmployeeWorkEntry_restaurantId_employeeId_workDate_idx" ON "EmployeeWorkEntry"("restaurantId", "employeeId", "workDate");
CREATE INDEX "EmployeeWorkEntry_restaurantId_status_workDate_idx" ON "EmployeeWorkEntry"("restaurantId", "status", "workDate");

CREATE UNIQUE INDEX "EmployeeEarning_publicId_key" ON "EmployeeEarning"("publicId");
CREATE UNIQUE INDEX "EmployeeEarning_id_restaurantId_key" ON "EmployeeEarning"("id", "restaurantId");
CREATE UNIQUE INDEX "EmployeeEarning_restaurantId_employeeId_sourceType_sourceId_type_key" ON "EmployeeEarning"("restaurantId", "employeeId", "sourceType", "sourceId", "type");
CREATE UNIQUE INDEX "EmployeeEarning_restaurantId_idempotencyKeyHash_key" ON "EmployeeEarning"("restaurantId", "idempotencyKeyHash");
CREATE INDEX "EmployeeEarning_restaurantId_employeeId_occurredAt_idx" ON "EmployeeEarning"("restaurantId", "employeeId", "occurredAt");
CREATE INDEX "EmployeeEarning_restaurantId_tableSessionId_type_idx" ON "EmployeeEarning"("restaurantId", "tableSessionId", "type");
CREATE INDEX "EmployeeEarning_restaurantId_settledAt_occurredAt_idx" ON "EmployeeEarning"("restaurantId", "settledAt", "occurredAt");

CREATE UNIQUE INDEX "EmployeeSettlement_publicId_key" ON "EmployeeSettlement"("publicId");
CREATE UNIQUE INDEX "EmployeeSettlement_id_restaurantId_key" ON "EmployeeSettlement"("id", "restaurantId");
CREATE UNIQUE INDEX "EmployeeSettlement_id_restaurantId_employeeId_key" ON "EmployeeSettlement"("id", "restaurantId", "employeeId");
CREATE UNIQUE INDEX "EmployeeSettlement_restaurantId_employeeId_periodYear_periodMonth_key" ON "EmployeeSettlement"("restaurantId", "employeeId", "periodYear", "periodMonth");
CREATE INDEX "EmployeeSettlement_restaurantId_status_periodStart_idx" ON "EmployeeSettlement"("restaurantId", "status", "periodStart");

CREATE UNIQUE INDEX "EmployeeSettlementItem_publicId_key" ON "EmployeeSettlementItem"("publicId");
CREATE UNIQUE INDEX "EmployeeSettlementItem_id_restaurantId_key" ON "EmployeeSettlementItem"("id", "restaurantId");
CREATE UNIQUE INDEX "EmployeeSettlementItem_settlementId_earningId_key" ON "EmployeeSettlementItem"("settlementId", "earningId");
CREATE UNIQUE INDEX "EmployeeSettlementItem_one_active_per_earning_idx" ON "EmployeeSettlementItem"("restaurantId", "earningId") WHERE "active" = true;
CREATE INDEX "EmployeeSettlementItem_restaurantId_earningId_active_idx" ON "EmployeeSettlementItem"("restaurantId", "earningId", "active");

CREATE UNIQUE INDEX "EmployeeSettlementPayment_publicId_key" ON "EmployeeSettlementPayment"("publicId");
CREATE UNIQUE INDEX "EmployeeSettlementPayment_id_restaurantId_key" ON "EmployeeSettlementPayment"("id", "restaurantId");
CREATE UNIQUE INDEX "EmployeeSettlementPayment_restaurantId_idempotencyKeyHash_key" ON "EmployeeSettlementPayment"("restaurantId", "idempotencyKeyHash");
CREATE INDEX "EmployeeSettlementPayment_restaurantId_settlementId_status_registeredAt_idx" ON "EmployeeSettlementPayment"("restaurantId", "settlementId", "status", "registeredAt");

ALTER TABLE "EmployeeCompensationPolicy" ADD CONSTRAINT "EmployeeCompensationPolicy_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeCompensationPolicy" ADD CONSTRAINT "EmployeeCompensationPolicy_employeeId_restaurantId_fkey" FOREIGN KEY ("employeeId", "restaurantId") REFERENCES "User"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TableWaiterAssignment" ADD CONSTRAINT "TableWaiterAssignment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TableWaiterAssignment" ADD CONSTRAINT "TableWaiterAssignment_tableSessionId_restaurantId_fkey" FOREIGN KEY ("tableSessionId", "restaurantId") REFERENCES "TableSession"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TableWaiterAssignment" ADD CONSTRAINT "TableWaiterAssignment_waiterId_restaurantId_fkey" FOREIGN KEY ("waiterId", "restaurantId") REFERENCES "User"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmployeeWorkEntry" ADD CONSTRAINT "EmployeeWorkEntry_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeWorkEntry" ADD CONSTRAINT "EmployeeWorkEntry_employeeId_restaurantId_fkey" FOREIGN KEY ("employeeId", "restaurantId") REFERENCES "User"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmployeeEarning" ADD CONSTRAINT "EmployeeEarning_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeEarning" ADD CONSTRAINT "EmployeeEarning_employeeId_restaurantId_fkey" FOREIGN KEY ("employeeId", "restaurantId") REFERENCES "User"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeEarning" ADD CONSTRAINT "EmployeeEarning_policyId_restaurantId_fkey" FOREIGN KEY ("policyId", "restaurantId") REFERENCES "EmployeeCompensationPolicy"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeEarning" ADD CONSTRAINT "EmployeeEarning_tableSessionId_restaurantId_fkey" FOREIGN KEY ("tableSessionId", "restaurantId") REFERENCES "TableSession"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeEarning" ADD CONSTRAINT "EmployeeEarning_paymentIntentId_restaurantId_tableSessionId_fkey" FOREIGN KEY ("paymentIntentId", "restaurantId", "tableSessionId") REFERENCES "TablePaymentIntent"("id", "restaurantId", "tableSessionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeEarning" ADD CONSTRAINT "EmployeeEarning_reversesEarningId_restaurantId_fkey" FOREIGN KEY ("reversesEarningId", "restaurantId") REFERENCES "EmployeeEarning"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmployeeSettlement" ADD CONSTRAINT "EmployeeSettlement_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSettlement" ADD CONSTRAINT "EmployeeSettlement_employeeId_restaurantId_fkey" FOREIGN KEY ("employeeId", "restaurantId") REFERENCES "User"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmployeeSettlementItem" ADD CONSTRAINT "EmployeeSettlementItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSettlementItem" ADD CONSTRAINT "EmployeeSettlementItem_settlementId_restaurantId_fkey" FOREIGN KEY ("settlementId", "restaurantId") REFERENCES "EmployeeSettlement"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSettlementItem" ADD CONSTRAINT "EmployeeSettlementItem_earningId_restaurantId_fkey" FOREIGN KEY ("earningId", "restaurantId") REFERENCES "EmployeeEarning"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EmployeeSettlementPayment" ADD CONSTRAINT "EmployeeSettlementPayment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeSettlementPayment" ADD CONSTRAINT "EmployeeSettlementPayment_settlementId_restaurantId_employeeId_fkey" FOREIGN KEY ("settlementId", "restaurantId", "employeeId") REFERENCES "EmployeeSettlement"("id", "restaurantId", "employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeSettlementPayment" ADD CONSTRAINT "EmployeeSettlementPayment_employeeId_restaurantId_fkey" FOREIGN KEY ("employeeId", "restaurantId") REFERENCES "User"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $rls$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'EmployeeCompensationPolicy',
    'TableWaiterAssignment',
    'EmployeeWorkEntry',
    'EmployeeEarning',
    'EmployeeSettlement',
    'EmployeeSettlementItem',
    'EmployeeSettlementPayment'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS PERMISSIVE FOR ALL TO PUBLIC USING ("restaurantId" = CASE WHEN current_setting(''app.restaurant_id'', true) ~ ''^[1-9][0-9]*$'' THEN current_setting(''app.restaurant_id'', true)::integer ELSE NULL END) WITH CHECK ("restaurantId" = CASE WHEN current_setting(''app.restaurant_id'', true) ~ ''^[1-9][0-9]*$'' THEN current_setting(''app.restaurant_id'', true)::integer ELSE NULL END)',
      table_name || '_tenant_isolation',
      table_name
    );
  END LOOP;
END
$rls$;