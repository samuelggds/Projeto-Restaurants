-- Keep existing guest IDs, orders and loyalty history while changing their internal alias.
-- The unique email constraint deliberately aborts on collisions instead of merging accounts.
UPDATE "User"
SET "email" = regexp_replace("email", '@pecaja\.local$', '@gastronexa.local')
WHERE "role" = 'CLIENTE'
  AND "email" ~ '^guest\.[0-9]+\.[0-9]{11}@pecaja\.local$'
  AND split_part("email", '.', 2) = "restaurantId"::text;

ALTER TABLE "PlatformSettings" ALTER COLUMN "platformName" SET DEFAULT 'GastroNexa';
UPDATE "PlatformSettings" SET "platformName" = 'GastroNexa'
WHERE lower("platformName") IN ('peça já', 'peça já food', 'peca ja', 'peca ja food', 's&c platform');
