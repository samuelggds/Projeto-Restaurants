-- Preserve every platform-invoice payment attempt instead of overwriting the
-- latest Mercado Pago identifier. This lets late Pix webhooks and recurring
-- card settlements be reconciled idempotently against the same invoice.

CREATE TYPE "InvoicePaymentAttemptMethod" AS ENUM ('PIX', 'CARD');
CREATE TYPE "InvoicePaymentAttemptStatus" AS ENUM (
  'PENDING',
  'APPLIED',
  'DUPLICATE',
  'REFUNDED',
  'FAILED',
  'EXPIRED'
);

CREATE UNIQUE INDEX "Invoice_id_restaurantId_key"
  ON "Invoice"("id", "restaurantId");

CREATE TABLE "InvoicePaymentAttempt" (
  "id" SERIAL NOT NULL,
  "invoiceId" INTEGER NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "method" "InvoicePaymentAttemptMethod" NOT NULL,
  "provider" VARCHAR(40) NOT NULL,
  "providerPaymentId" VARCHAR(191) NOT NULL,
  "status" "InvoicePaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(10,2) NOT NULL,
  "providerStatus" VARCHAR(80),
  "settledAt" TIMESTAMP(3),
  "appliedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "lastReconciledAt" TIMESTAMP(3),
  "reconciliationAttempts" INTEGER NOT NULL DEFAULT 0,
  "nextReconciliationAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InvoicePaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoicePaymentAttempt_provider_providerPaymentId_key"
  ON "InvoicePaymentAttempt"("provider", "providerPaymentId");
CREATE UNIQUE INDEX "InvoicePaymentAttempt_id_restaurantId_key"
  ON "InvoicePaymentAttempt"("id", "restaurantId");
CREATE INDEX "InvoicePaymentAttempt_invoiceId_restaurantId_createdAt_idx"
  ON "InvoicePaymentAttempt"("invoiceId", "restaurantId", "createdAt");
CREATE INDEX "InvoicePaymentAttempt_restaurantId_status_createdAt_idx"
  ON "InvoicePaymentAttempt"("restaurantId", "status", "createdAt");
CREATE INDEX "InvoicePaymentAttempt_status_nextReconciliationAt_id_idx"
  ON "InvoicePaymentAttempt"("status", "nextReconciliationAt", "id");

ALTER TABLE "InvoicePaymentAttempt"
  ADD CONSTRAINT "InvoicePaymentAttempt_invoiceId_restaurantId_fkey"
  FOREIGN KEY ("invoiceId", "restaurantId")
  REFERENCES "Invoice"("id", "restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoicePaymentAttempt"
  ADD CONSTRAINT "InvoicePaymentAttempt_restaurantId_fkey"
  FOREIGN KEY ("restaurantId")
  REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill the currently persisted Pix identifier. Older overwritten identifiers
-- cannot be reconstructed, but every attempt generated after this migration is
-- retained permanently.
INSERT INTO "InvoicePaymentAttempt" (
  "invoiceId",
  "restaurantId",
  "method",
  "provider",
  "providerPaymentId",
  "status",
  "amount",
  "nextReconciliationAt",
  "createdAt",
  "updatedAt"
)
SELECT
  invoice."id",
  invoice."restaurantId",
  'PIX'::"InvoicePaymentAttemptMethod",
  'MERCADO_PAGO',
  invoice."paymentExternalId",
  CASE
    WHEN invoice."status" = 'PAGO' THEN 'APPLIED'::"InvoicePaymentAttemptStatus"
    ELSE 'PENDING'::"InvoicePaymentAttemptStatus"
  END,
  invoice."total",
  CURRENT_TIMESTAMP,
  invoice."createdAt",
  CURRENT_TIMESTAMP
FROM "Invoice" AS invoice
WHERE invoice."paymentExternalId" IS NOT NULL
  AND invoice."paymentExternalId" <> ''
ON CONFLICT ("provider", "providerPaymentId") DO NOTHING;
