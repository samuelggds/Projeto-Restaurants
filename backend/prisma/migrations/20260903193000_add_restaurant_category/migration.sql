-- Categoria operacional do tenant usada para personalizar a identidade das telas públicas.
ALTER TABLE "Restaurant"
ADD COLUMN "category" TEXT NOT NULL DEFAULT 'RESTAURANTE';

ALTER TABLE "Restaurant"
ADD CONSTRAINT "Restaurant_category_check"
CHECK (
  "category" IN (
    'RESTAURANTE',
    'PIZZARIA',
    'HAMBURGUERIA',
    'ACAITERIA',
    'CAFETERIA',
    'JAPONESA',
    'CHURRASCARIA',
    'DOCERIA',
    'LANCHONETE',
    'PADARIA',
    'OUTRO'
  )
);

-- Tenant criado antes da introdução da categoria.
UPDATE "Restaurant"
SET "category" = 'PIZZARIA'
WHERE LOWER(TRIM("name")) = 'north pizza'
   OR LOWER(TRIM("slug")) IN ('north-pizza', 'northpizza');
