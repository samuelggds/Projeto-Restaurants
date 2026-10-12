ALTER TABLE "RestaurantSettings" ADD COLUMN "tableReservationsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RestaurantSettings" ADD COLUMN "tableReservationToleranceMinutes" INTEGER NOT NULL DEFAULT 15;
CREATE TABLE "TableReservation" (
 "id" SERIAL PRIMARY KEY,
 "publicId" TEXT NOT NULL UNIQUE,
 "restaurantId" INTEGER NOT NULL,
 "tableId" INTEGER NOT NULL,
 "guestName" VARCHAR(100) NOT NULL,
 "guestPhone" VARCHAR(20) NOT NULL,
 "guestCount" INTEGER NOT NULL,
 "startsAt" TIMESTAMPTZ(3) NOT NULL,
 "endsAt" TIMESTAMPTZ(3) NOT NULL,
 "status" VARCHAR(24) NOT NULL DEFAULT 'CONFIRMED',
 "note" VARCHAR(500),
 "createdById" INTEGER,
 "checkedInAt" TIMESTAMPTZ(3),
 "canceledAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "TableReservation_table_tenant_fkey" FOREIGN KEY ("tableId","restaurantId") REFERENCES "Table"("id","restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "TableReservation_restaurant_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "TableReservation_status_check" CHECK ("status" IN ('CONFIRMED','SEATED','CANCELED','NO_SHOW','COMPLETED')),
 CONSTRAINT "TableReservation_guests_check" CHECK ("guestCount" BETWEEN 1 AND 100),
 CONSTRAINT "TableReservation_interval_check" CHECK ("endsAt" > "startsAt")
);
CREATE UNIQUE INDEX "TableReservation_id_restaurantId_key" ON "TableReservation"("id","restaurantId");
CREATE INDEX "TableReservation_restaurantId_startsAt_status_idx" ON "TableReservation"("restaurantId","startsAt","status");
CREATE INDEX "TableReservation_restaurantId_tableId_startsAt_idx" ON "TableReservation"("restaurantId","tableId","startsAt");
-- Prevent concurrent overlapping confirmed reservations on one table.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "TableReservation" ADD CONSTRAINT "TableReservation_no_overlap"
  EXCLUDE USING gist ("restaurantId" WITH =, "tableId" WITH =, tstzrange("startsAt","endsAt",'[)') WITH &&)
  WHERE ("status" = 'CONFIRMED');
ALTER TABLE "TableReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TableReservation" FORCE ROW LEVEL SECURITY;
CREATE POLICY "TableReservation_tenant_isolation" ON "TableReservation" FOR ALL TO PUBLIC
 USING ("restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$' THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END)
 WITH CHECK ("restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$' THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END);
