WITH "EligibleIngredientCategories" AS (
  SELECT
    "ingredient"."id" AS "ingredientId",
    "ingredient"."restaurantId",
    MIN(BTRIM("group"."name")) AS "category"
  FROM "Ingredient" AS "ingredient"
  INNER JOIN "ProductOption" AS "option"
    ON "option"."ingredientId" = "ingredient"."id"
  INNER JOIN "ProductOptionGroup" AS "group"
    ON "group"."id" = "option"."groupId"
    AND "group"."restaurantId" = "ingredient"."restaurantId"
  WHERE
    "ingredient"."category" = 'Geral'
    AND BTRIM("group"."name") <> ''
  GROUP BY
    "ingredient"."id",
    "ingredient"."restaurantId"
  HAVING COUNT(DISTINCT LOWER(BTRIM("group"."name"))) = 1
)
UPDATE "Ingredient" AS "ingredient"
SET
  "category" = "eligible"."category",
  "updatedAt" = CURRENT_TIMESTAMP
FROM "EligibleIngredientCategories" AS "eligible"
WHERE
  "ingredient"."id" = "eligible"."ingredientId"
  AND "ingredient"."restaurantId" = "eligible"."restaurantId"
  AND "ingredient"."category" = 'Geral';
