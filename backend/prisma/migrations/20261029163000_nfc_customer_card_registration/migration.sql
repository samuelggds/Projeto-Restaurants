-- NFC customer and card registration is additive and disabled for checkout/ordering.
-- These tables are always accessed with the authenticated restaurantId.
CREATE TYPE "NfcCardStatus" AS ENUM ('PENDING_WRITE', 'READY', 'ACTIVE', 'REVOKED');

CREATE TABLE "NfcCustomer" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "nameEncrypted" TEXT NOT NULL,
  "cpfEncrypted" TEXT NOT NULL,
  "cpfFingerprint" CHAR(64) NOT NULL,
  "phoneEncrypted" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "NfcCustomer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NfcCustomer_id_restaurantId_key" ON "NfcCustomer"("id", "restaurantId");
CREATE UNIQUE INDEX "NfcCustomer_restaurantId_cpfFingerprint_key" ON "NfcCustomer"("restaurantId", "cpfFingerprint");
CREATE INDEX "NfcCustomer_restaurantId_createdAt_idx" ON "NfcCustomer"("restaurantId", "createdAt");
ALTER TABLE "NfcCustomer" ADD CONSTRAINT "NfcCustomer_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NfcCard" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "customerId" UUID,
  "displayCode" VARCHAR(32) NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "status" "NfcCardStatus" NOT NULL DEFAULT 'PENDING_WRITE',
  "issuedByUserId" INTEGER NOT NULL,
  "activatedByUserId" INTEGER,
  "activatedAt" TIMESTAMPTZ(3),
  "revokedByUserId" INTEGER,
  "revokedAt" TIMESTAMPTZ(3),
  "revokeReason" VARCHAR(160),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "NfcCard_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NfcCard_id_restaurantId_key" ON "NfcCard"("id", "restaurantId");
CREATE UNIQUE INDEX "NfcCard_tokenHash_key" ON "NfcCard"("tokenHash");
CREATE UNIQUE INDEX "NfcCard_restaurantId_displayCode_key" ON "NfcCard"("restaurantId", "displayCode");
CREATE INDEX "NfcCard_restaurantId_customerId_status_idx" ON "NfcCard"("restaurantId", "customerId", "status");
-- Defends against racing requests for another unprogrammed/active card.
CREATE UNIQUE INDEX "NfcCard_one_current_per_customer_idx" ON "NfcCard"("restaurantId", "customerId")
  WHERE "status" IN ('PENDING_WRITE', 'ACTIVE');
ALTER TABLE "NfcCard" ADD CONSTRAINT "NfcCard_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NfcCard" ADD CONSTRAINT "NfcCard_customerId_restaurantId_fkey"
  FOREIGN KEY ("customerId", "restaurantId") REFERENCES "NfcCustomer"("id", "restaurantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "NfcRegistrationAudit" (
  "id" BIGSERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "actorUserId" INTEGER NOT NULL,
  "customerId" UUID,
  "cardId" UUID,
  "action" VARCHAR(48) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NfcRegistrationAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NfcRegistrationAudit_restaurantId_createdAt_idx" ON "NfcRegistrationAudit"("restaurantId", "createdAt");
CREATE INDEX "NfcRegistrationAudit_restaurantId_customerId_idx" ON "NfcRegistrationAudit"("restaurantId", "customerId");
ALTER TABLE "NfcRegistrationAudit" ADD CONSTRAINT "NfcRegistrationAudit_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
