ALTER TABLE "ProductOption"
  ALTER COLUMN "ingredientId" DROP NOT NULL,
  ADD COLUMN "referenceProductId" INTEGER;

ALTER TABLE "ProductOption"
  ADD CONSTRAINT "ProductOption_source_check"
  CHECK (
    ("ingredientId" IS NOT NULL AND "referenceProductId" IS NULL)
    OR
    ("ingredientId" IS NULL AND "referenceProductId" IS NOT NULL)
  );

CREATE UNIQUE INDEX "ProductOption_groupId_referenceProductId_key"
  ON "ProductOption"("groupId", "referenceProductId");

CREATE INDEX "ProductOption_referenceProductId_idx"
  ON "ProductOption"("referenceProductId");

ALTER TABLE "ProductOption"
  ADD CONSTRAINT "ProductOption_referenceProductId_restaurantId_fkey"
  FOREIGN KEY ("referenceProductId", "restaurantId")
  REFERENCES "Product"("id", "restaurantId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
