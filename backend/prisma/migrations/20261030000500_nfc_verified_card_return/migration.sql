-- The same physical NFC chip can be reused after full CPF verification and backend-confirmed settlement.
-- Lockout is durable across app instances. Historical comandas keep their original cardId.
ALTER TABLE "NfcCard"
  ADD COLUMN "failedReturnCpfAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "returnCpfLockedUntil" TIMESTAMPTZ(3);
ALTER TABLE "NfcCard"
  ADD CONSTRAINT "NfcCard_failedReturnCpfAttempts_check"
  CHECK ("failedReturnCpfAttempts" >= 0);
ALTER TABLE "NfcCard"
  ADD CONSTRAINT "NfcCard_ready_has_no_customer"
  CHECK ("status" <> 'READY' OR "customerId" IS NULL);
