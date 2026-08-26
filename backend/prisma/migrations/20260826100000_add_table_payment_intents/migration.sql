-- Estrutura financeira aditiva para pagamentos parciais da conta da mesa.
-- Nenhum pedido, item ou pagamento legado é alterado ou removido.
CREATE TYPE "TablePaymentIntentStatus" AS ENUM (
  'RESERVED',
  'PROCESSING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELED',
  'REFUNDED'
);

CREATE TYPE "TablePaymentSelectionMode" AS ENUM (
  'MY_ITEMS',
  'SELECTED_ITEMS',
  'EQUAL_SPLIT',
  'FULL_ACCOUNT',
  'WAITER'
);

CREATE TYPE "TablePaymentMethod" AS ENUM ('PIX', 'CARD', 'CASH', 'CARD_MACHINE');

CREATE TYPE "TablePaymentEventType" AS ENUM (
  'CREATED',
  'PROCESSING',
  'PAID',
  'FAILED',
  'EXPIRED',
  'CANCELED',
  'REFUNDED',
  'MANUAL_CONFIRMED',
  'PROVIDER_WEBHOOK'
);

CREATE UNIQUE INDEX "TableBillItem_id_restaurantId_tableSessionId_key"
ON "TableBillItem"("id", "restaurantId", "tableSessionId");

CREATE TABLE "TablePaymentIntent" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "tableSessionId" INTEGER NOT NULL,
  "payerParticipantId" INTEGER NOT NULL,
  "selectionMode" "TablePaymentSelectionMode" NOT NULL,
  "method" "TablePaymentMethod" NOT NULL,
  "status" "TablePaymentIntentStatus" NOT NULL DEFAULT 'RESERVED',
  "splitCount" INTEGER,
  "idempotencyKeyHash" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "subtotalCents" BIGINT NOT NULL,
  "serviceFeeCents" BIGINT NOT NULL DEFAULT 0,
  "totalCents" BIGINT NOT NULL,
  "provider" TEXT,
  "providerExternalId" TEXT,
  "providerCheckoutUrl" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "processingAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "manualConfirmedById" INTEGER,
  "manualConfirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TablePaymentIntent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TablePaymentIntent_money_check" CHECK (
    "subtotalCents" >= 0
    AND "serviceFeeCents" >= 0
    AND "totalCents" > 0
    AND "totalCents" = "subtotalCents" + "serviceFeeCents"
  ),
  CONSTRAINT "TablePaymentIntent_split_check" CHECK (
    (
      "selectionMode" = 'EQUAL_SPLIT'
      AND "splitCount" BETWEEN 2 AND 100
    )
    OR (
      "selectionMode" <> 'EQUAL_SPLIT'
      AND "splitCount" IS NULL
    )
  ),
  CONSTRAINT "TablePaymentIntent_expiry_check" CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "TablePaymentIntent_provider_reference_check" CHECK (
    ("provider" IS NULL AND "providerExternalId" IS NULL)
    OR ("provider" IS NOT NULL AND "providerExternalId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "TablePaymentIntent_publicId_key"
ON "TablePaymentIntent"("publicId");
CREATE UNIQUE INDEX "TablePaymentIntent_restaurantId_tableSessionId_idempotencyKeyHash_key"
ON "TablePaymentIntent"("restaurantId", "tableSessionId", "idempotencyKeyHash");
CREATE UNIQUE INDEX "TablePaymentIntent_provider_providerExternalId_key"
ON "TablePaymentIntent"("provider", "providerExternalId");
CREATE UNIQUE INDEX "TablePaymentIntent_id_restaurantId_tableSessionId_key"
ON "TablePaymentIntent"("id", "restaurantId", "tableSessionId");
CREATE INDEX "TablePaymentIntent_restaurantId_tableSessionId_status_expiresAt_idx"
ON "TablePaymentIntent"("restaurantId", "tableSessionId", "status", "expiresAt");
CREATE INDEX "TablePaymentIntent_payerParticipantId_createdAt_idx"
ON "TablePaymentIntent"("payerParticipantId", "createdAt");

CREATE TABLE "TablePaymentAllocation" (
  "id" SERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "tableSessionId" INTEGER NOT NULL,
  "paymentIntentId" INTEGER NOT NULL,
  "tableBillItemId" INTEGER NOT NULL,
  "amountCents" BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TablePaymentAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TablePaymentAllocation_amount_check" CHECK ("amountCents" > 0)
);

CREATE UNIQUE INDEX "TablePaymentAllocation_paymentIntentId_tableBillItemId_key"
ON "TablePaymentAllocation"("paymentIntentId", "tableBillItemId");
CREATE INDEX "TablePaymentAllocation_tableBillItemId_idx"
ON "TablePaymentAllocation"("tableBillItemId");
CREATE INDEX "TablePaymentAllocation_restaurantId_tableSessionId_idx"
ON "TablePaymentAllocation"("restaurantId", "tableSessionId");

CREATE TABLE "TablePaymentEvent" (
  "id" SERIAL NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "tableSessionId" INTEGER NOT NULL,
  "paymentIntentId" INTEGER NOT NULL,
  "deduplicationKey" TEXT NOT NULL,
  "type" "TablePaymentEventType" NOT NULL,
  "fromStatus" "TablePaymentIntentStatus",
  "toStatus" "TablePaymentIntentStatus",
  "provider" TEXT,
  "providerEventId" TEXT,
  "amountCents" BIGINT,
  "actorUserId" INTEGER,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TablePaymentEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TablePaymentEvent_amount_check" CHECK (
    "amountCents" IS NULL OR "amountCents" >= 0
  )
);

CREATE UNIQUE INDEX "TablePaymentEvent_deduplicationKey_key"
ON "TablePaymentEvent"("deduplicationKey");
CREATE INDEX "TablePaymentEvent_restaurantId_tableSessionId_createdAt_idx"
ON "TablePaymentEvent"("restaurantId", "tableSessionId", "createdAt");
CREATE INDEX "TablePaymentEvent_paymentIntentId_createdAt_idx"
ON "TablePaymentEvent"("paymentIntentId", "createdAt");

ALTER TABLE "TablePaymentIntent"
ADD CONSTRAINT "TablePaymentIntent_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TablePaymentIntent"
ADD CONSTRAINT "TablePaymentIntent_tableSessionId_fkey"
FOREIGN KEY ("tableSessionId", "restaurantId")
REFERENCES "TableSession"("id", "restaurantId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TablePaymentIntent"
ADD CONSTRAINT "TablePaymentIntent_payerParticipantId_fkey"
FOREIGN KEY ("payerParticipantId", "tableSessionId", "restaurantId")
REFERENCES "TableParticipant"("id", "tableSessionId", "restaurantId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TablePaymentIntent"
ADD CONSTRAINT "TablePaymentIntent_manualConfirmedById_fkey"
FOREIGN KEY ("manualConfirmedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TablePaymentAllocation"
ADD CONSTRAINT "TablePaymentAllocation_paymentIntentId_fkey"
FOREIGN KEY ("paymentIntentId", "restaurantId", "tableSessionId")
REFERENCES "TablePaymentIntent"("id", "restaurantId", "tableSessionId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TablePaymentAllocation"
ADD CONSTRAINT "TablePaymentAllocation_tableBillItemId_fkey"
FOREIGN KEY ("tableBillItemId", "restaurantId", "tableSessionId")
REFERENCES "TableBillItem"("id", "restaurantId", "tableSessionId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TablePaymentAllocation"
ADD CONSTRAINT "TablePaymentAllocation_tableSessionId_fkey"
FOREIGN KEY ("tableSessionId", "restaurantId")
REFERENCES "TableSession"("id", "restaurantId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TablePaymentEvent"
ADD CONSTRAINT "TablePaymentEvent_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TablePaymentEvent"
ADD CONSTRAINT "TablePaymentEvent_tableSessionId_fkey"
FOREIGN KEY ("tableSessionId", "restaurantId")
REFERENCES "TableSession"("id", "restaurantId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TablePaymentEvent"
ADD CONSTRAINT "TablePaymentEvent_paymentIntentId_fkey"
FOREIGN KEY ("paymentIntentId", "restaurantId", "tableSessionId")
REFERENCES "TablePaymentIntent"("id", "restaurantId", "tableSessionId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TablePaymentEvent"
ADD CONSTRAINT "TablePaymentEvent_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
