-- Vincula pedidos de mesa à sessão e ao participante sem alterar os pedidos
-- históricos. Convidados passam a poder possuir pedidos sem a criação de um
-- usuário artificial.
CREATE TYPE "TableOrderSettlementMode" AS ENUM ('TABLE_ACCOUNT', 'PAY_NOW');
CREATE TYPE "TableOrderFinancialStatus" AS ENUM ('UNPAID', 'RESERVED', 'PROCESSING', 'PAID', 'REFUNDED');
CREATE TYPE "TableBillItemFinancialStatus" AS ENUM ('UNPAID', 'RESERVED', 'PROCESSING', 'PAID', 'REFUNDED');

ALTER TABLE "Order"
ADD COLUMN "publicId" TEXT,
ADD COLUMN "tableSessionId" INTEGER,
ADD COLUMN "participantId" INTEGER,
ADD COLUMN "settlementMode" "TableOrderSettlementMode",
ADD COLUMN "tableFinancialStatus" "TableOrderFinancialStatus";

WITH "generatedOrderIds" AS (
  SELECT
    "id",
    md5(random()::text || clock_timestamp()::text || "id"::text) AS "value"
  FROM "Order"
)
UPDATE "Order" AS "order"
SET "publicId" = concat(
  substr("generated"."value", 1, 8), '-',
  substr("generated"."value", 9, 4), '-',
  substr("generated"."value", 13, 4), '-',
  substr("generated"."value", 17, 4), '-',
  substr("generated"."value", 21, 12)
)
FROM "generatedOrderIds" AS "generated"
WHERE "order"."id" = "generated"."id";

ALTER TABLE "Order"
ALTER COLUMN "publicId" SET NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Order" DROP CONSTRAINT "Order_userId_fkey";
ALTER TABLE "Order"
ADD CONSTRAINT "Order_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Order_publicId_key" ON "Order"("publicId");
CREATE UNIQUE INDEX "Order_id_restaurantId_key" ON "Order"("id", "restaurantId");
CREATE UNIQUE INDEX "Order_id_restaurantId_tableSessionId_participantId_key"
ON "Order"("id", "restaurantId", "tableSessionId", "participantId");
CREATE INDEX "Order_restaurantId_tableSessionId_participantId_createdAt_idx"
ON "Order"("restaurantId", "tableSessionId", "participantId", "createdAt");

CREATE UNIQUE INDEX "TableParticipant_id_tableSessionId_restaurantId_key"
ON "TableParticipant"("id", "tableSessionId", "restaurantId");

ALTER TABLE "Order"
ADD CONSTRAINT "Order_tableSessionId_fkey"
FOREIGN KEY ("tableSessionId", "restaurantId")
REFERENCES "TableSession"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_participantId_fkey"
FOREIGN KEY ("participantId", "tableSessionId", "restaurantId")
REFERENCES "TableParticipant"("id", "tableSessionId", "restaurantId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_table_participant_scope_check" CHECK (
  (
    "participantId" IS NULL
    AND "tableSessionId" IS NULL
    AND "settlementMode" IS NULL
    AND "tableFinancialStatus" IS NULL
  )
  OR (
    "participantId" IS NOT NULL
    AND "tableSessionId" IS NOT NULL
    AND "settlementMode" IS NOT NULL
    AND "tableFinancialStatus" IS NOT NULL
  )
);

ALTER TABLE "OrderItem"
ADD COLUMN "restaurantId" INTEGER,
ADD COLUMN "tableSessionId" INTEGER,
ADD COLUMN "participantId" INTEGER;

CREATE UNIQUE INDEX "OrderItem_id_orderId_key" ON "OrderItem"("id", "orderId");
CREATE UNIQUE INDEX "OrderItem_id_orderId_restaurantId_tableSessionId_participantId_key"
ON "OrderItem"("id", "orderId", "restaurantId", "tableSessionId", "participantId");
CREATE INDEX "OrderItem_restaurantId_tableSessionId_participantId_idx"
ON "OrderItem"("restaurantId", "tableSessionId", "participantId");

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_participantId_fkey"
FOREIGN KEY ("participantId", "tableSessionId", "restaurantId")
REFERENCES "TableParticipant"("id", "tableSessionId", "restaurantId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_table_participant_scope_check" CHECK (
  ("participantId" IS NULL AND "tableSessionId" IS NULL AND "restaurantId" IS NULL)
  OR ("participantId" IS NOT NULL AND "tableSessionId" IS NOT NULL AND "restaurantId" IS NOT NULL)
);

CREATE TABLE "TableBillItem" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "tableSessionId" INTEGER NOT NULL,
  "participantId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "orderItemId" INTEGER NOT NULL,
  "unitIndex" INTEGER NOT NULL,
  "productName" TEXT NOT NULL,
  "unitPriceCents" BIGINT NOT NULL,
  "financialStatus" "TableBillItemFinancialStatus" NOT NULL DEFAULT 'UNPAID',
  "paidAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "cancellationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TableBillItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TableBillItem_unit_index_check" CHECK ("unitIndex" > 0),
  CONSTRAINT "TableBillItem_unit_price_check" CHECK ("unitPriceCents" >= 0)
);

CREATE UNIQUE INDEX "TableBillItem_publicId_key" ON "TableBillItem"("publicId");
CREATE UNIQUE INDEX "TableBillItem_orderItemId_unitIndex_key"
ON "TableBillItem"("orderItemId", "unitIndex");
CREATE INDEX "TableBillItem_restaurantId_tableSessionId_financialStatus_idx"
ON "TableBillItem"("restaurantId", "tableSessionId", "financialStatus");
CREATE INDEX "TableBillItem_participantId_financialStatus_idx"
ON "TableBillItem"("participantId", "financialStatus");
CREATE INDEX "TableBillItem_orderId_idx" ON "TableBillItem"("orderId");

ALTER TABLE "TableBillItem"
ADD CONSTRAINT "TableBillItem_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TableBillItem"
ADD CONSTRAINT "TableBillItem_tableSessionId_fkey"
FOREIGN KEY ("tableSessionId", "restaurantId")
REFERENCES "TableSession"("id", "restaurantId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TableBillItem"
ADD CONSTRAINT "TableBillItem_participantId_fkey"
FOREIGN KEY ("participantId", "tableSessionId", "restaurantId")
REFERENCES "TableParticipant"("id", "tableSessionId", "restaurantId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TableBillItem"
ADD CONSTRAINT "TableBillItem_orderId_fkey"
FOREIGN KEY ("orderId", "restaurantId", "tableSessionId", "participantId")
REFERENCES "Order"("id", "restaurantId", "tableSessionId", "participantId")
ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE "TableBillItem"
ADD CONSTRAINT "TableBillItem_orderItemId_fkey"
FOREIGN KEY ("orderItemId", "orderId", "restaurantId", "tableSessionId", "participantId")
REFERENCES "OrderItem"("id", "orderId", "restaurantId", "tableSessionId", "participantId")
ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
