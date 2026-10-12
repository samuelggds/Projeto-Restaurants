CREATE TABLE "TableSessionTransfer" (
"id" SERIAL NOT NULL PRIMARY KEY,
"restaurantId" INTEGER NOT NULL,
"tableSessionId" INTEGER NOT NULL,
"fromTableId" INTEGER NOT NULL,
"toTableId" INTEGER NOT NULL,
"transferredById" INTEGER NOT NULL,
"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "TableSessionTransfer_distinct_tables" CHECK ("fromTableId" <> "toTableId"),
CONSTRAINT "TableSessionTransfer_restaurant_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
CONSTRAINT "TableSessionTransfer_session_fkey" FOREIGN KEY ("tableSessionId","restaurantId") REFERENCES "TableSession"("id","restaurantId") ON DELETE RESTRICT,
CONSTRAINT "TableSessionTransfer_from_fkey" FOREIGN KEY ("fromTableId","restaurantId") REFERENCES "Table"("id","restaurantId") ON DELETE RESTRICT,
CONSTRAINT "TableSessionTransfer_to_fkey" FOREIGN KEY ("toTableId","restaurantId") REFERENCES "Table"("id","restaurantId") ON DELETE RESTRICT,
CONSTRAINT "TableSessionTransfer_actor_fkey" FOREIGN KEY ("transferredById","restaurantId") REFERENCES "User"("id","restaurantId") ON DELETE RESTRICT
);
CREATE INDEX "TableSessionTransfer_restaurant_session_created_idx" ON "TableSessionTransfer"("restaurantId","tableSessionId","createdAt");
CREATE INDEX "TableSessionTransfer_restaurant_destination_created_idx" ON "TableSessionTransfer"("restaurantId","toTableId","createdAt");
ALTER TABLE "TableSessionTransfer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TableSessionTransfer" FORCE ROW LEVEL SECURITY;
CREATE POLICY "TableSessionTransfer_tenant_isolation" ON "TableSessionTransfer" FOR ALL TO PUBLIC
 USING ("restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$' THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END)
 WITH CHECK ("restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$' THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END);
