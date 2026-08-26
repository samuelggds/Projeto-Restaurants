-- Garante também no banco que uma sessão não possa combinar a mesa de um
-- restaurante com o restaurantId de outro tenant.
CREATE UNIQUE INDEX "Table_id_restaurantId_key" ON "Table"("id", "restaurantId");

ALTER TABLE "TableSession" DROP CONSTRAINT "TableSession_tableId_fkey";

ALTER TABLE "TableSession"
ADD CONSTRAINT "TableSession_tableId_fkey"
FOREIGN KEY ("tableId", "restaurantId") REFERENCES "Table"("id", "restaurantId")
ON DELETE CASCADE ON UPDATE CASCADE;
