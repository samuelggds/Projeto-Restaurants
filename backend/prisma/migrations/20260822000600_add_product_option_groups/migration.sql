CREATE TYPE "ProductOptionSelectionType" AS ENUM ('SINGLE', 'MULTIPLE');

ALTER TABLE "OrderItem" ADD COLUMN "customizations" JSONB;

CREATE TABLE "ProductOptionGroup" (
  "id" SERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "selectionType" "ProductOptionSelectionType" NOT NULL DEFAULT 'SINGLE',
  "minSelections" INTEGER NOT NULL DEFAULT 0,
  "maxSelections" INTEGER NOT NULL DEFAULT 1,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductOptionGroup_selection_limits_check" CHECK (
    "minSelections" >= 0 AND
    "maxSelections" >= 1 AND
    "minSelections" <= "maxSelections" AND
    ("selectionType" <> 'SINGLE' OR "maxSelections" = 1) AND
    (NOT "required" OR "minSelections" >= 1)
  )
);

CREATE TABLE "ProductOption" (
  "id" SERIAL NOT NULL,
  "groupId" INTEGER NOT NULL,
  "ingredientId" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "ProductOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ProductOptionGroup_productId_name_key" ON "ProductOptionGroup"("productId", "name");
CREATE INDEX "ProductOptionGroup_restaurantId_active_idx" ON "ProductOptionGroup"("restaurantId", "active");
CREATE INDEX "ProductOptionGroup_productId_position_idx" ON "ProductOptionGroup"("productId", "position");
CREATE UNIQUE INDEX "ProductOption_groupId_ingredientId_key" ON "ProductOption"("groupId", "ingredientId");
CREATE INDEX "ProductOption_groupId_active_position_idx" ON "ProductOption"("groupId", "active", "position");
CREATE INDEX "ProductOption_ingredientId_idx" ON "ProductOption"("ingredientId");
