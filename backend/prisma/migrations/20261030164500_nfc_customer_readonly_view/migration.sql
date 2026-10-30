-- Independent verification limiter for customer read-only NFC visits.
-- Payment release and order verification retain their own lockout counters.
ALTER TABLE "NfcCard"
  ADD COLUMN "failedGuestViewAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "guestViewLockedUntil" TIMESTAMPTZ(3);

ALTER TABLE "NfcCard"
  ADD CONSTRAINT "NfcCard_guestViewAttempts_nonnegative"
  CHECK ("failedGuestViewAttempts" >= 0);
