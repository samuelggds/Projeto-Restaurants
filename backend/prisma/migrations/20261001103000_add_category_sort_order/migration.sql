ALTER TABLE "Category"
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ((ROW_NUMBER() OVER (
      PARTITION BY "restaurantId"
      ORDER BY LOWER("name"), id
    )) - 1)::integer AS position
  FROM "Category"
)
UPDATE "Category" AS category
SET "sortOrder" = ranked.position
FROM ranked
WHERE category.id = ranked.id;

CREATE INDEX "Category_restaurantId_sortOrder_id_idx"
ON "Category"("restaurantId", "sortOrder", "id");
