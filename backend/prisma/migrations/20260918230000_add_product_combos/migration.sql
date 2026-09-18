-- Dedicated combo catalog built on top of Product while preserving tenant isolation.
CREATE TYPE "ProductKind" AS ENUM ('STANDARD', 'COMBO');

ALTER TABLE "Product"
  ADD COLUMN "kind" "ProductKind" NOT NULL DEFAULT 'STANDARD';

CREATE TABLE "ProductComboGroup" (
  "id" SERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "minSelections" INTEGER NOT NULL DEFAULT 1,
  "maxSelections" INTEGER NOT NULL DEFAULT 1,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductComboGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductComboOption" (
  "id" SERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "groupId" INTEGER NOT NULL,
  "componentProductId" INTEGER NOT NULL,
  "additionalPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "minQuantity" INTEGER NOT NULL DEFAULT 0,
  "maxQuantity" INTEGER NOT NULL DEFAULT 1,
  "defaultQuantity" INTEGER NOT NULL DEFAULT 0,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductComboOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductComboGroup_productId_name_key"
  ON "ProductComboGroup"("productId", "name");
CREATE UNIQUE INDEX "ProductComboGroup_id_restaurantId_key"
  ON "ProductComboGroup"("id", "restaurantId");
CREATE INDEX "ProductComboGroup_restaurantId_active_idx"
  ON "ProductComboGroup"("restaurantId", "active");
CREATE INDEX "ProductComboGroup_productId_position_idx"
  ON "ProductComboGroup"("productId", "position");

CREATE UNIQUE INDEX "ProductComboOption_groupId_componentProductId_key"
  ON "ProductComboOption"("groupId", "componentProductId");
CREATE UNIQUE INDEX "ProductComboOption_id_restaurantId_key"
  ON "ProductComboOption"("id", "restaurantId");
CREATE INDEX "ProductComboOption_restaurantId_active_idx"
  ON "ProductComboOption"("restaurantId", "active");
CREATE INDEX "ProductComboOption_groupId_active_position_idx"
  ON "ProductComboOption"("groupId", "active", "position");
CREATE INDEX "ProductComboOption_componentProductId_idx"
  ON "ProductComboOption"("componentProductId");

ALTER TABLE "ProductComboGroup"
  ADD CONSTRAINT "ProductComboGroup_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductComboGroup"
  ADD CONSTRAINT "ProductComboGroup_productId_restaurantId_fkey"
  FOREIGN KEY ("productId", "restaurantId") REFERENCES "Product"("id", "restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductComboOption"
  ADD CONSTRAINT "ProductComboOption_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductComboOption"
  ADD CONSTRAINT "ProductComboOption_groupId_restaurantId_fkey"
  FOREIGN KEY ("groupId", "restaurantId") REFERENCES "ProductComboGroup"("id", "restaurantId")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductComboOption"
  ADD CONSTRAINT "ProductComboOption_componentProductId_restaurantId_fkey"
  FOREIGN KEY ("componentProductId", "restaurantId") REFERENCES "Product"("id", "restaurantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductComboGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductComboGroup" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ProductComboGroup_tenant_isolation"
ON "ProductComboGroup" AS PERMISSIVE FOR ALL TO PUBLIC
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

ALTER TABLE "ProductComboOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductComboOption" FORCE ROW LEVEL SECURITY;
CREATE POLICY "ProductComboOption_tenant_isolation"
ON "ProductComboOption" AS PERMISSIVE FOR ALL TO PUBLIC
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
