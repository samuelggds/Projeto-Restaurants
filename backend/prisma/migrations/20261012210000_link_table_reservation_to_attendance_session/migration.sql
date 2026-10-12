-- Keep reservations and session/payment history intact while linking check-ins exactly.
ALTER TABLE "TableReservation" ADD COLUMN "tableSessionId" INTEGER;

CREATE UNIQUE INDEX "TableReservation_tableSessionId_restaurantId_key"
  ON "TableReservation"("tableSessionId", "restaurantId");

ALTER TABLE "TableReservation"
  ADD CONSTRAINT "TableReservation_session_tenant_fkey"
  FOREIGN KEY ("tableSessionId", "restaurantId")
  REFERENCES "TableSession"("id", "restaurantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recover only unambiguous legacy check-ins for the exact same tenant and table.
-- Other legacy records stay unlinked rather than risk completing the wrong reservation.
WITH candidates AS (
  SELECT r."id" AS reservation_id, s."id" AS session_id,
    count(*) OVER (PARTITION BY r."id") AS reservation_matches,
    count(*) OVER (PARTITION BY s."id") AS session_matches
  FROM "TableReservation" r
  JOIN "TableSession" s
    ON s."restaurantId" = r."restaurantId"
   AND s."tableId" = r."tableId"
   AND s."openedAt" BETWEEN r."checkedInAt" - interval '60 seconds'
                        AND r."checkedInAt" + interval '60 seconds'
  WHERE r."status" = 'SEATED'
    AND r."checkedInAt" IS NOT NULL
    AND r."tableSessionId" IS NULL
)
UPDATE "TableReservation" r
SET "tableSessionId" = c.session_id
FROM candidates c
WHERE r."id" = c.reservation_id
  AND c.reservation_matches = 1
  AND c.session_matches = 1;
