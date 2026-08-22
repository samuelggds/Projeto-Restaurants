CREATE TABLE "Ingredient" (
  "id" SERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Ingredient_restaurantId_name_key" ON "Ingredient"("restaurantId", "name");
CREATE INDEX "Ingredient_restaurantId_active_idx" ON "Ingredient"("restaurantId", "active");
