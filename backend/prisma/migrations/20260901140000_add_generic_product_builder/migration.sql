CREATE TYPE "ProductOptionPricingMode" AS ENUM ('ADDITIVE', 'ABSOLUTE');
CREATE TYPE "ProductPortionPricingStrategy" AS ENUM ('ADD', 'HIGHEST', 'AVERAGE', 'PROPORTIONAL', 'FIXED');

ALTER TABLE "Product"
  ADD COLUMN "configurationVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "OrderItem"
  ADD COLUMN "configurationSnapshot" JSONB;

ALTER TABLE "ProductOption"
  ADD COLUMN "restaurantId" INTEGER,
  ADD COLUMN "additionalPrice" DECIMAL(10,2),
  ADD COLUMN "pricingMode" "ProductOptionPricingMode" NOT NULL DEFAULT 'ADDITIVE',
  ADD COLUMN "absolutePrice" DECIMAL(10,2),
  ADD COLUMN "allowQuantity" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "minQuantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maxQuantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "defaultQuantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "defaultSelected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ProductOption" AS option
SET
  "restaurantId" = choice_group."restaurantId",
  "additionalPrice" = ingredient."price"
FROM "ProductOptionGroup" AS choice_group, "Ingredient" AS ingredient
WHERE option."groupId" = choice_group."id"
  AND option."ingredientId" = ingredient."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ProductOption" AS option
    JOIN "ProductOptionGroup" AS choice_group ON choice_group."id" = option."groupId"
    JOIN "Ingredient" AS ingredient ON ingredient."id" = option."ingredientId"
    WHERE choice_group."restaurantId" <> ingredient."restaurantId"
       OR option."restaurantId" IS NULL
       OR option."additionalPrice" IS NULL
  ) THEN
    RAISE EXCEPTION 'ProductOption legado possui associação cross-tenant ou incompleta';
  END IF;
END $$;

ALTER TABLE "ProductOption"
  ALTER COLUMN "restaurantId" SET NOT NULL,
  ALTER COLUMN "additionalPrice" SET NOT NULL,
  ALTER COLUMN "additionalPrice" SET DEFAULT 0;

ALTER TABLE "ProductOption"
  ADD CONSTRAINT "ProductOption_pricing_check" CHECK (
    "additionalPrice" >= 0 AND
    ("absolutePrice" IS NULL OR "absolutePrice" >= 0) AND
    (("pricingMode" = 'ADDITIVE' AND "absolutePrice" IS NULL) OR
     ("pricingMode" = 'ABSOLUTE' AND "absolutePrice" IS NOT NULL))
  ),
  ADD CONSTRAINT "ProductOption_quantity_check" CHECK (
    "minQuantity" >= 1 AND
    "maxQuantity" >= "minQuantity" AND
    "maxQuantity" <= 99 AND
    "defaultQuantity" BETWEEN "minQuantity" AND "maxQuantity" AND
    ("allowQuantity" OR (
      "minQuantity" = 1 AND "maxQuantity" = 1 AND "defaultQuantity" = 1
    )) AND
    (NOT "locked" OR "defaultSelected")
  );

CREATE UNIQUE INDEX "Product_id_restaurantId_key" ON "Product"("id", "restaurantId");
CREATE UNIQUE INDEX "Ingredient_id_restaurantId_key" ON "Ingredient"("id", "restaurantId");
CREATE UNIQUE INDEX "ProductOptionGroup_id_restaurantId_key" ON "ProductOptionGroup"("id", "restaurantId");
CREATE UNIQUE INDEX "ProductOption_id_restaurantId_key" ON "ProductOption"("id", "restaurantId");
CREATE INDEX "ProductOption_restaurantId_active_idx" ON "ProductOption"("restaurantId", "active");

ALTER TABLE "ProductOptionGroup" DROP CONSTRAINT "ProductOptionGroup_productId_fkey";
ALTER TABLE "ProductOption" DROP CONSTRAINT "ProductOption_groupId_fkey";
ALTER TABLE "ProductOption" DROP CONSTRAINT "ProductOption_ingredientId_fkey";

ALTER TABLE "ProductOptionGroup"
  ADD CONSTRAINT "ProductOptionGroup_productId_restaurantId_fkey"
  FOREIGN KEY ("productId", "restaurantId") REFERENCES "Product"("id", "restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductOption"
  ADD CONSTRAINT "ProductOption_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductOption_groupId_restaurantId_fkey"
  FOREIGN KEY ("groupId", "restaurantId") REFERENCES "ProductOptionGroup"("id", "restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductOption_ingredientId_restaurantId_fkey"
  FOREIGN KEY ("ingredientId", "restaurantId") REFERENCES "Ingredient"("id", "restaurantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProductCompositionItem" (
  "id" SERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "ingredientId" INTEGER NOT NULL,
  "removable" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCompositionItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductCompositionItem_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "ProductPortionConfiguration" (
  "id" SERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "optionGroupId" INTEGER,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "minPortions" INTEGER NOT NULL DEFAULT 1,
  "maxPortions" INTEGER NOT NULL DEFAULT 2,
  "pricingStrategy" "ProductPortionPricingStrategy" NOT NULL DEFAULT 'HIGHEST',
  "allowPortionObservations" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductPortionConfiguration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductPortionConfiguration_limits_check" CHECK (
    "minPortions" >= 1 AND
    "maxPortions" >= "minPortions" AND
    "maxPortions" <= 8
  )
);

CREATE TABLE "ProductConfigurationTemplate" (
  "id" SERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "configuration" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductConfigurationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductCompositionItem_productId_ingredientId_key"
  ON "ProductCompositionItem"("productId", "ingredientId");
CREATE UNIQUE INDEX "ProductCompositionItem_id_restaurantId_key"
  ON "ProductCompositionItem"("id", "restaurantId");
CREATE INDEX "ProductCompositionItem_restaurantId_active_idx"
  ON "ProductCompositionItem"("restaurantId", "active");
CREATE INDEX "ProductCompositionItem_productId_position_idx"
  ON "ProductCompositionItem"("productId", "position");

CREATE UNIQUE INDEX "ProductPortionConfiguration_productId_restaurantId_key"
  ON "ProductPortionConfiguration"("productId", "restaurantId");
CREATE UNIQUE INDEX "ProductPortionConfiguration_id_restaurantId_key"
  ON "ProductPortionConfiguration"("id", "restaurantId");
CREATE INDEX "ProductPortionConfiguration_restaurantId_enabled_idx"
  ON "ProductPortionConfiguration"("restaurantId", "enabled");
CREATE INDEX "ProductPortionConfiguration_optionGroupId_idx"
  ON "ProductPortionConfiguration"("optionGroupId");

CREATE UNIQUE INDEX "ProductConfigurationTemplate_restaurantId_name_key"
  ON "ProductConfigurationTemplate"("restaurantId", "name");
CREATE UNIQUE INDEX "ProductConfigurationTemplate_id_restaurantId_key"
  ON "ProductConfigurationTemplate"("id", "restaurantId");
CREATE INDEX "ProductConfigurationTemplate_restaurantId_active_createdAt_idx"
  ON "ProductConfigurationTemplate"("restaurantId", "active", "createdAt");

ALTER TABLE "ProductCompositionItem"
  ADD CONSTRAINT "ProductCompositionItem_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductCompositionItem_productId_restaurantId_fkey"
  FOREIGN KEY ("productId", "restaurantId") REFERENCES "Product"("id", "restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductCompositionItem_ingredientId_restaurantId_fkey"
  FOREIGN KEY ("ingredientId", "restaurantId") REFERENCES "Ingredient"("id", "restaurantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductPortionConfiguration"
  ADD CONSTRAINT "ProductPortionConfiguration_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductPortionConfiguration_productId_restaurantId_fkey"
  FOREIGN KEY ("productId", "restaurantId") REFERENCES "Product"("id", "restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProductPortionConfiguration_optionGroupId_restaurantId_fkey"
  FOREIGN KEY ("optionGroupId", "restaurantId") REFERENCES "ProductOptionGroup"("id", "restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductConfigurationTemplate"
  ADD CONSTRAINT "ProductConfigurationTemplate_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductCompositionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCompositionItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ProductCompositionItem_tenant_isolation"
ON "ProductCompositionItem" AS PERMISSIVE FOR ALL TO PUBLIC
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

ALTER TABLE "ProductPortionConfiguration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductPortionConfiguration" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ProductPortionConfiguration_tenant_isolation"
ON "ProductPortionConfiguration" AS PERMISSIVE FOR ALL TO PUBLIC
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

ALTER TABLE "ProductConfigurationTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductConfigurationTemplate" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ProductConfigurationTemplate_tenant_isolation"
ON "ProductConfigurationTemplate" AS PERMISSIVE FOR ALL TO PUBLIC
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