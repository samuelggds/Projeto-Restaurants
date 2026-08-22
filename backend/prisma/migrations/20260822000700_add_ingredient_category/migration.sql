ALTER TABLE "Ingredient"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Geral';

CREATE INDEX "Ingredient_restaurantId_category_active_idx"
  ON "Ingredient"("restaurantId", "category", "active");
