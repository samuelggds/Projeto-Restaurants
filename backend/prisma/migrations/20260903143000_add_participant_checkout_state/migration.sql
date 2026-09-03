-- A solicitação de conta agora pertence ao participante, não à mesa inteira.
-- O estado abaixo complementa TableParticipant sem transformar LEFT em estado financeiro.
CREATE TABLE "TableParticipantState" (
  "participantId" INTEGER NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "tableSessionId" INTEGER NOT NULL,
  "phone" VARCHAR(20),
  "orderingBlockedAt" TIMESTAMP(3),
  "orderingUnblockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TableParticipantState_pkey" PRIMARY KEY ("participantId"),
  CONSTRAINT "TableParticipantState_participant_tenant_fkey"
    FOREIGN KEY ("participantId", "tableSessionId", "restaurantId")
    REFERENCES "TableParticipant"("id", "tableSessionId", "restaurantId")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TableParticipantState_session_tenant_fkey"
    FOREIGN KEY ("tableSessionId", "restaurantId")
    REFERENCES "TableSession"("id", "restaurantId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TableParticipantState_participant_session_tenant_key"
  ON "TableParticipantState"("participantId", "tableSessionId", "restaurantId");
CREATE INDEX "TableParticipantState_tenant_session_blocked_idx"
  ON "TableParticipantState"("restaurantId", "tableSessionId", "orderingBlockedAt");

-- Vincula o chamado de conta ao participante que realmente o solicitou.
ALTER TABLE "TableServiceCall" ADD COLUMN "participantId" INTEGER;
ALTER TABLE "TableServiceCall"
  ADD CONSTRAINT "TableServiceCall_participant_tenant_fkey"
  FOREIGN KEY ("participantId", "tableSessionId", "restaurantId")
  REFERENCES "TableParticipant"("id", "tableSessionId", "restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "TableServiceCall_active_table_type_key";

-- Chamado comum ao garçom continua único por mesa.
CREATE UNIQUE INDEX "TableServiceCall_active_waiter_table_key"
  ON "TableServiceCall"("tableId", "type")
  WHERE "status" IN ('WAITING', 'IN_PROGRESS') AND "type" = 'WAITER';

-- Conta é individual: pessoas diferentes na mesma mesa podem pedir a própria conta.
CREATE UNIQUE INDEX "TableServiceCall_active_bill_participant_key"
  ON "TableServiceCall"("tableSessionId", "participantId", "type")
  WHERE "status" IN ('WAITING', 'IN_PROGRESS')
    AND "type" = 'BILL'
    AND "participantId" IS NOT NULL;

-- Mantém idempotência para chamados BILL legados que ainda não têm participante.
CREATE UNIQUE INDEX "TableServiceCall_active_legacy_bill_table_key"
  ON "TableServiceCall"("tableId", "type")
  WHERE "status" IN ('WAITING', 'IN_PROGRESS')
    AND "type" = 'BILL'
    AND "participantId" IS NULL;

CREATE INDEX "TableServiceCall_participant_status_idx"
  ON "TableServiceCall"("restaurantId", "participantId", "status");

ALTER TABLE "TableParticipantState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TableParticipantState" FORCE ROW LEVEL SECURITY;

CREATE POLICY "TableParticipantState_tenant_isolation"
ON "TableParticipantState" AS PERMISSIVE FOR ALL TO PUBLIC
USING (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
)
WITH CHECK (
  "restaurantId" = CASE
    WHEN current_setting('app.restaurant_id', true) ~ '^[1-9][0-9]*$'
      THEN current_setting('app.restaurant_id', true)::integer
    ELSE NULL
  END
);
