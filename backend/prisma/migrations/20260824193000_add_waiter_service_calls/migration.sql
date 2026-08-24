CREATE TYPE "TableServiceCallType" AS ENUM ('WAITER', 'BILL');
CREATE TYPE "TableServiceCallStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'RESOLVED');

-- Sessões antigas não tinham uma restrição física que impedisse duas linhas
-- OPEN para a mesma mesa. Fecha sessões expiradas/duplicadas antes de criar a
-- proteção usada pelo fluxo de abertura sem PIN.
UPDATE "TableSession"
SET "status" = 'CLOSED', "closedAt" = COALESCE("closedAt", CURRENT_TIMESTAMP)
WHERE "status" = 'OPEN'
  AND "expiresAt" IS NOT NULL
  AND "expiresAt" <= CURRENT_TIMESTAMP;

WITH "rankedOpenSessions" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tableId"
      ORDER BY "openedAt" DESC, "id" DESC
    ) AS "position"
  FROM "TableSession"
  WHERE "status" = 'OPEN'
)
UPDATE "TableSession" AS "session"
SET "status" = 'CLOSED', "closedAt" = COALESCE("closedAt", CURRENT_TIMESTAMP)
FROM "rankedOpenSessions" AS "ranked"
WHERE "session"."id" = "ranked"."id"
  AND "ranked"."position" > 1;

CREATE UNIQUE INDEX "TableSession_one_open_per_table_key"
ON "TableSession"("tableId")
WHERE "status" = 'OPEN';

CREATE TABLE "TableServiceCall" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "tableId" INTEGER NOT NULL,
    "tableSessionId" INTEGER NOT NULL,
    "type" "TableServiceCallType" NOT NULL,
    "status" "TableServiceCallStatus" NOT NULL DEFAULT 'WAITING',
    "assignedToId" INTEGER,
    "resolvedById" INTEGER,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableServiceCall_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TableServiceCall_restaurantId_status_requestedAt_idx"
ON "TableServiceCall"("restaurantId", "status", "requestedAt");

CREATE INDEX "TableServiceCall_tableId_status_idx"
ON "TableServiceCall"("tableId", "status");

CREATE INDEX "TableServiceCall_tableSessionId_status_idx"
ON "TableServiceCall"("tableSessionId", "status");

-- Evita que cliques repetidos ou duas requisições concorrentes criem mais de
-- um chamado ativo do mesmo tipo para a mesma mesa.
CREATE UNIQUE INDEX "TableServiceCall_active_table_type_key"
ON "TableServiceCall"("tableId", "type")
WHERE "status" IN ('WAITING', 'IN_PROGRESS');

ALTER TABLE "TableServiceCall"
ADD CONSTRAINT "TableServiceCall_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TableServiceCall"
ADD CONSTRAINT "TableServiceCall_tableId_fkey"
FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TableServiceCall"
ADD CONSTRAINT "TableServiceCall_tableSessionId_fkey"
FOREIGN KEY ("tableSessionId") REFERENCES "TableSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TableServiceCall"
ADD CONSTRAINT "TableServiceCall_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TableServiceCall"
ADD CONSTRAINT "TableServiceCall_resolvedById_fkey"
FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
