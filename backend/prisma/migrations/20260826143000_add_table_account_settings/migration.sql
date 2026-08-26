-- Etapa 5: configurações financeiras por restaurante para contas de mesa.
-- A migration é somente aditiva e mantém o comportamento existente até o admin ativar o recurso.
CREATE TYPE "TableServiceFeeMode" AS ENUM ('DISABLED', 'OPTIONAL', 'MANDATORY');

CREATE TABLE "TableAccountSettings" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "requirePrepaymentAboveCents" BIGINT,
    "prepaymentWindows" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "allowCash" BOOLEAN NOT NULL DEFAULT false,
    "allowCardMachine" BOOLEAN NOT NULL DEFAULT false,
    "allowOnlinePayment" BOOLEAN NOT NULL DEFAULT true,
    "allowSplit" BOOLEAN NOT NULL DEFAULT true,
    "serviceFeeMode" "TableServiceFeeMode" NOT NULL DEFAULT 'DISABLED',
    "serviceFeeBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "preventCloseWithOutstandingBalance" BOOLEAN NOT NULL DEFAULT true,
    "requireEmployeeApprovalForPreparedItemCancellation" BOOLEAN NOT NULL DEFAULT true,
    "blockNewOrdersOnClosingRequest" BOOLEAN NOT NULL DEFAULT true,
    "reservationTimeoutMinutes" INTEGER NOT NULL DEFAULT 10,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableAccountSettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TableAccountSettings_prepayment_nonnegative" CHECK (
      "requirePrepaymentAboveCents" IS NULL OR "requirePrepaymentAboveCents" >= 0
    ),
    CONSTRAINT "TableAccountSettings_service_fee_range" CHECK (
      "serviceFeeBasisPoints" BETWEEN 0 AND 10000
    ),
    CONSTRAINT "TableAccountSettings_service_fee_mode" CHECK (
      ("serviceFeeMode" = 'DISABLED' AND "serviceFeeBasisPoints" = 0)
      OR ("serviceFeeMode" <> 'DISABLED' AND "serviceFeeBasisPoints" > 0)
    ),
    CONSTRAINT "TableAccountSettings_reservation_timeout" CHECK (
      "reservationTimeoutMinutes" BETWEEN 1 AND 60
    )
);

CREATE UNIQUE INDEX "TableAccountSettings_restaurantId_key"
ON "TableAccountSettings"("restaurantId");

ALTER TABLE "TableAccountSettings"
ADD CONSTRAINT "TableAccountSettings_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserva os restaurantes que já utilizavam o cardápio de mesa. Restaurantes
-- criados depois da migration continuam com o opt-in seguro (enabled=false).
INSERT INTO "TableAccountSettings" ("restaurantId", "enabled", "updatedAt")
SELECT r."id", COALESCE(rs."tableOrderingEnabled", true), CURRENT_TIMESTAMP
FROM "Restaurant" r
LEFT JOIN "RestaurantSettings" rs ON rs."restaurantId" = r."id";
