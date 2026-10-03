ALTER TABLE "RestaurantSettings"
ADD COLUMN "deliveryTimeMin" INTEGER,
ADD COLUMN "deliveryTimeMax" INTEGER;

ALTER TABLE "RestaurantSettings"
ADD CONSTRAINT "RestaurantSettings_deliveryTimeMin_range_check"
CHECK ("deliveryTimeMin" IS NULL OR ("deliveryTimeMin" >= 1 AND "deliveryTimeMin" <= 240));

ALTER TABLE "RestaurantSettings"
ADD CONSTRAINT "RestaurantSettings_deliveryTimeMax_range_check"
CHECK ("deliveryTimeMax" IS NULL OR ("deliveryTimeMax" >= 1 AND "deliveryTimeMax" <= 240));

ALTER TABLE "RestaurantSettings"
ADD CONSTRAINT "RestaurantSettings_deliveryTime_pair_check"
CHECK (
  ("deliveryTimeMin" IS NULL AND "deliveryTimeMax" IS NULL)
  OR
  ("deliveryTimeMin" IS NOT NULL AND "deliveryTimeMax" IS NOT NULL)
);

ALTER TABLE "RestaurantSettings"
ADD CONSTRAINT "RestaurantSettings_deliveryTime_order_check"
CHECK (
  "deliveryTimeMin" IS NULL
  OR "deliveryTimeMax" IS NULL
  OR "deliveryTimeMax" >= "deliveryTimeMin"
);
