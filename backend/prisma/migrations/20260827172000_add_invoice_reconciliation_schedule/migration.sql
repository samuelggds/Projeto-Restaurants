ALTER TABLE "Invoice"
ADD COLUMN "lastReconciledAt" TIMESTAMP(3),
ADD COLUMN "reconciliationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextReconciliationAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Invoice_status_nextReconciliationAt_id_idx"
ON "Invoice"("status", "nextReconciliationAt", "id");
