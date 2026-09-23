-- Require verified e-mail only for accounts that explicitly opt into the new flow.
-- Existing accounts remain compatible because emailVerificationRequired defaults to false.
ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "emailVerificationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

CREATE TABLE "EmailVerificationToken" (
  "id" UUID NOT NULL,
  "userId" INTEGER NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "emailNormalized" VARCHAR(254) NOT NULL,
  "restaurantSlug" VARCHAR(191),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_userId_key"
  ON "EmailVerificationToken"("userId");
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key"
  ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_expiresAt_idx"
  ON "EmailVerificationToken"("expiresAt");

ALTER TABLE "EmailVerificationToken"
  ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "PhoneVerificationPurpose" AS ENUM ('ENROLLMENT', 'PASSWORD_RESET');

CREATE TABLE "PhoneVerificationChallenge" (
  "id" UUID NOT NULL,
  "userId" INTEGER NOT NULL,
  "purpose" "PhoneVerificationPurpose" NOT NULL,
  "phoneE164" VARCHAR(16) NOT NULL,
  "sessionInfoCiphertext" TEXT NOT NULL,
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PhoneVerificationChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhoneVerificationChallenge_userId_purpose_expiresAt_idx"
  ON "PhoneVerificationChallenge"("userId", "purpose", "expiresAt");
CREATE INDEX "PhoneVerificationChallenge_expiresAt_idx"
  ON "PhoneVerificationChallenge"("expiresAt");

ALTER TABLE "PhoneVerificationChallenge"
  ADD CONSTRAINT "PhoneVerificationChallenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
