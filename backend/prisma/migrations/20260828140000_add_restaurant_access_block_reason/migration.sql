CREATE TYPE "RestaurantAccessBlockReason" AS ENUM ('NONE', 'MANUAL', 'BILLING');

ALTER TABLE "Restaurant"
  ADD COLUMN "accessBlockReason" "RestaurantAccessBlockReason" NOT NULL DEFAULT 'NONE';

-- Preserva a intenção dos bloqueios que já existiam antes desta migração.
-- Assinatura expirada ou fatura atrasada indicam bloqueio financeiro; os
-- demais restaurantes inativos são tratados de forma conservadora como
-- suspensão manual do SUPER_ADMIN.
UPDATE "Restaurant" AS restaurant
SET "accessBlockReason" = 'BILLING'
WHERE restaurant."active" = FALSE
  AND (
    EXISTS (
      SELECT 1
      FROM "Subscription" AS subscription
      WHERE subscription."restaurantId" = restaurant."id"
        AND subscription."status" = 'EXPIRADA'
    )
    OR EXISTS (
      SELECT 1
      FROM "Invoice" AS invoice
      WHERE invoice."restaurantId" = restaurant."id"
        AND invoice."status" = 'ATRASADO'
    )
  );

UPDATE "Restaurant"
SET "accessBlockReason" = 'MANUAL'
WHERE "active" = FALSE
  AND "accessBlockReason" = 'NONE';

CREATE INDEX "Restaurant_accessBlockReason_active_idx"
  ON "Restaurant"("accessBlockReason", "active");
