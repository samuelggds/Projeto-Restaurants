-- Exception for temporary, audited SUPER_ADMIN authorization; no invoice is paid or waived.
ALTER TABLE "Restaurant"
  ADD COLUMN "billingTemporaryAccessUntil" TIMESTAMPTZ(3);
