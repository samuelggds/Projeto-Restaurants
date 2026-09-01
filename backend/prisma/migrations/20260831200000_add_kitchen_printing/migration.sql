-- Optional, durable kitchen command printing.
-- Existing restaurants remain disabled until an ADMIN explicitly opts in.

CREATE TYPE "PrinterAutoPrintTrigger" AS ENUM ('NEW_ORDER', 'PAYMENT_CONFIRMED');
CREATE TYPE "PrinterPaperWidth" AS ENUM ('MM58', 'MM80');
CREATE TYPE "KitchenPrintJobType" AS ENUM ('ORDER', 'TEST');
CREATE TYPE "KitchenPrintJobSource" AS ENUM ('AUTOMATIC', 'MANUAL', 'TEST');
CREATE TYPE "KitchenPrintJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'PRINTED', 'FAILED', 'CANCELLED');

CREATE TABLE "RestaurantPrinterSettings" (
  "id" SERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "autoPrintEnabled" BOOLEAN NOT NULL DEFAULT false,
  "autoPrintTrigger" "PrinterAutoPrintTrigger" NOT NULL DEFAULT 'NEW_ORDER',
  "paperWidth" "PrinterPaperWidth" NOT NULL DEFAULT 'MM80',
  "copies" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantPrinterSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantPrinterSettings_copies_check" CHECK ("copies" BETWEEN 1 AND 5)
);

CREATE TABLE "PrinterAgentDevice" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "tokenHash" TEXT NOT NULL,
  "printerName" TEXT,
  "lastSeenAt" TIMESTAMP(3),
  "appVersion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrinterAgentDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitchenPrintJob" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "orderId" INTEGER,
  "type" "KitchenPrintJobType" NOT NULL,
  "source" "KitchenPrintJobSource" NOT NULL,
  "trigger" "PrinterAutoPrintTrigger",
  "status" "KitchenPrintJobStatus" NOT NULL DEFAULT 'PENDING',
  "payloadVersion" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "paperWidth" "PrinterPaperWidth" NOT NULL,
  "copies" INTEGER NOT NULL DEFAULT 1,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedAt" TIMESTAMP(3),
  "leaseExpiresAt" TIMESTAMP(3),
  "claimedByDeviceId" INTEGER,
  "printedAt" TIMESTAMP(3),
  "lastError" VARCHAR(1000),
  "deduplicationKey" VARCHAR(191) NOT NULL,
  "requestedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KitchenPrintJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KitchenPrintJob_copies_check" CHECK ("copies" BETWEEN 1 AND 5),
  CONSTRAINT "KitchenPrintJob_attempts_check" CHECK ("attempts" >= 0),
  CONSTRAINT "KitchenPrintJob_payloadVersion_check" CHECK ("payloadVersion" > 0)
);

CREATE UNIQUE INDEX "RestaurantPrinterSettings_restaurantId_key"
ON "RestaurantPrinterSettings"("restaurantId");
CREATE INDEX "RestaurantPrinterSettings_restaurantId_enabled_autoPrintEnabled_idx"
ON "RestaurantPrinterSettings"("restaurantId", "enabled", "autoPrintEnabled");

CREATE UNIQUE INDEX "PrinterAgentDevice_publicId_key" ON "PrinterAgentDevice"("publicId");
CREATE UNIQUE INDEX "PrinterAgentDevice_id_restaurantId_key"
ON "PrinterAgentDevice"("id", "restaurantId");
CREATE INDEX "PrinterAgentDevice_restaurantId_active_lastSeenAt_idx"
ON "PrinterAgentDevice"("restaurantId", "active", "lastSeenAt");

CREATE UNIQUE INDEX "KitchenPrintJob_publicId_key" ON "KitchenPrintJob"("publicId");
CREATE UNIQUE INDEX "KitchenPrintJob_deduplicationKey_key"
ON "KitchenPrintJob"("deduplicationKey");
CREATE INDEX "KitchenPrintJob_restaurantId_status_availableAt_createdAt_idx"
ON "KitchenPrintJob"("restaurantId", "status", "availableAt", "createdAt");
CREATE INDEX "KitchenPrintJob_restaurantId_orderId_createdAt_idx"
ON "KitchenPrintJob"("restaurantId", "orderId", "createdAt");
CREATE INDEX "KitchenPrintJob_claimedByDeviceId_leaseExpiresAt_idx"
ON "KitchenPrintJob"("claimedByDeviceId", "leaseExpiresAt");

ALTER TABLE "RestaurantPrinterSettings"
ADD CONSTRAINT "RestaurantPrinterSettings_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PrinterAgentDevice"
ADD CONSTRAINT "PrinterAgentDevice_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KitchenPrintJob"
ADD CONSTRAINT "KitchenPrintJob_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenPrintJob"
ADD CONSTRAINT "KitchenPrintJob_orderId_restaurantId_fkey"
FOREIGN KEY ("orderId", "restaurantId") REFERENCES "Order"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KitchenPrintJob"
ADD CONSTRAINT "KitchenPrintJob_claimedByDeviceId_restaurantId_fkey"
FOREIGN KEY ("claimedByDeviceId", "restaurantId") REFERENCES "PrinterAgentDevice"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KitchenPrintJob"
ADD CONSTRAINT "KitchenPrintJob_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The private settings and queue use the same fail-closed RLS context as the
-- existing pilot tables. Application-level restaurantId filters remain
-- mandatory defense in depth.
ALTER TABLE "RestaurantPrinterSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RestaurantPrinterSettings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "RestaurantPrinterSettings_tenant_isolation"
ON "RestaurantPrinterSettings"
AS PERMISSIVE FOR ALL TO PUBLIC
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

ALTER TABLE "KitchenPrintJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KitchenPrintJob" FORCE ROW LEVEL SECURITY;
CREATE POLICY "KitchenPrintJob_tenant_isolation"
ON "KitchenPrintJob"
AS PERMISSIVE FOR ALL TO PUBLIC
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

COMMENT ON TABLE "PrinterAgentDevice" IS
'Bootstrap credential registry intentionally outside RLS: publicId and token hash are validated before deriving the persisted tenant. Queue access always enters the derived tenant context.';
