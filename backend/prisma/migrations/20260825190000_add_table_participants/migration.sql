-- A sessão passa a ter identidade pública e tenant direto. Todos os campos
-- novos são preenchidos antes de se tornarem obrigatórios, preservando as
-- sessões já existentes.
DROP INDEX IF EXISTS "TableSession_one_open_per_table_key";

ALTER TABLE "TableSession" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "TableSessionStatus" RENAME TO "TableSessionStatus_legacy";
CREATE TYPE "TableSessionStatus" AS ENUM ('OPEN', 'CLOSING_REQUESTED', 'CLOSED');
ALTER TABLE "TableSession"
ALTER COLUMN "status" TYPE "TableSessionStatus"
USING ("status"::text::"TableSessionStatus");
DROP TYPE "TableSessionStatus_legacy";
ALTER TABLE "TableSession" ALTER COLUMN "status" SET DEFAULT 'OPEN';

ALTER TABLE "TableSession"
ADD COLUMN "publicId" TEXT,
ADD COLUMN "restaurantId" INTEGER,
ADD COLUMN "closingRequestedById" INTEGER,
ADD COLUMN "forceClosedById" INTEGER,
ADD COLUMN "closingRequestedAt" TIMESTAMP(3),
ADD COLUMN "forcedClosed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "forceCloseReason" TEXT;

WITH "generatedSessionIds" AS (
  SELECT
    "id",
    md5(random()::text || clock_timestamp()::text || "id"::text) AS "value"
  FROM "TableSession"
)
UPDATE "TableSession" AS "session"
SET "publicId" = concat(
  substr("generated"."value", 1, 8), '-',
  substr("generated"."value", 9, 4), '-',
  substr("generated"."value", 13, 4), '-',
  substr("generated"."value", 17, 4), '-',
  substr("generated"."value", 21, 12)
)
FROM "generatedSessionIds" AS "generated"
WHERE "session"."id" = "generated"."id";

UPDATE "TableSession" AS "session"
SET "restaurantId" = "table"."restaurantId"
FROM "Table" AS "table"
WHERE "session"."tableId" = "table"."id";

ALTER TABLE "TableSession"
ALTER COLUMN "publicId" SET NOT NULL,
ALTER COLUMN "restaurantId" SET NOT NULL;

CREATE UNIQUE INDEX "TableSession_publicId_key" ON "TableSession"("publicId");
CREATE UNIQUE INDEX "TableSession_id_restaurantId_key"
ON "TableSession"("id", "restaurantId");
CREATE INDEX "TableSession_restaurantId_status_openedAt_idx"
ON "TableSession"("restaurantId", "status", "openedAt");
CREATE INDEX "TableSession_tableId_status_idx" ON "TableSession"("tableId", "status");

CREATE UNIQUE INDEX "TableSession_one_active_per_table_key"
ON "TableSession"("tableId")
WHERE "status" IN ('OPEN', 'CLOSING_REQUESTED');

ALTER TABLE "TableSession"
ADD CONSTRAINT "TableSession_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TableSession"
ADD CONSTRAINT "TableSession_closingRequestedById_fkey"
FOREIGN KEY ("closingRequestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TableSession"
ADD CONSTRAINT "TableSession_forceClosedById_fkey"
FOREIGN KEY ("forceClosedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "TableParticipantStatus" AS ENUM ('ACTIVE', 'LEFT');

CREATE TABLE "TableParticipant" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "tableSessionId" INTEGER NOT NULL,
  "userId" INTEGER,
  "displayName" TEXT,
  "guestTokenHash" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "status" "TableParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TableParticipant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TableParticipant_identity_check" CHECK (
    "userId" IS NOT NULL OR ("guestTokenHash" IS NOT NULL AND "tokenExpiresAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "TableParticipant_publicId_key" ON "TableParticipant"("publicId");
CREATE UNIQUE INDEX "TableParticipant_guestTokenHash_key"
ON "TableParticipant"("guestTokenHash");
CREATE UNIQUE INDEX "TableParticipant_tableSessionId_userId_key"
ON "TableParticipant"("tableSessionId", "userId");
CREATE INDEX "TableParticipant_restaurantId_tableSessionId_status_idx"
ON "TableParticipant"("restaurantId", "tableSessionId", "status");
CREATE INDEX "TableParticipant_userId_status_idx"
ON "TableParticipant"("userId", "status");

ALTER TABLE "TableParticipant"
ADD CONSTRAINT "TableParticipant_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TableParticipant"
ADD CONSTRAINT "TableParticipant_tableSessionId_fkey"
FOREIGN KEY ("tableSessionId", "restaurantId") REFERENCES "TableSession"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TableParticipant"
ADD CONSTRAINT "TableParticipant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
