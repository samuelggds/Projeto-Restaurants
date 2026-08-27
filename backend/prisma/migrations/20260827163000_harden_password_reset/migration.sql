ALTER TABLE "User"
ADD COLUMN "resetPasswordFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "resetPasswordLockedUntil" TIMESTAMP(3);
