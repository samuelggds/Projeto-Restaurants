-- Authenticator factor is provisioned per account, never shared across tenants.
ALTER TABLE "User" ADD COLUMN "mfaTotpEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "AuthTotpCredential" (
  "userId" INTEGER NOT NULL,
  "secretCiphertext" TEXT,
  "pendingSecretCiphertext" TEXT,
  "pendingExpiresAt" TIMESTAMPTZ(3),
  "pendingFailedAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastUsedStep" BIGINT NOT NULL DEFAULT -1,
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "loginLockedUntil" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthTotpCredential_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "AuthTotpCredential_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AuthTotpCredential_pendingExpiresAt_idx" ON "AuthTotpCredential"("pendingExpiresAt");
