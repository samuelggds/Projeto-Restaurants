-- NFC consumption ledger. No changes to QR table sessions or existing Order rows.
ALTER TABLE "RestaurantSettings" ADD COLUMN "nfcCoverChargeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RestaurantSettings" ADD CONSTRAINT "RestaurantSettings_nfcCoverChargeCents_check" CHECK ("nfcCoverChargeCents" BETWEEN 0 AND 10000000);
CREATE TYPE "NfcComandaStatus" AS ENUM ('OPEN','UNPAID','PAID');
CREATE TYPE "NfcComandaItemKind" AS ENUM ('COVER','ORDER');
CREATE TYPE "NfcComandaPaymentStatus" AS ENUM ('PENDING','CONFIRMED','REVERSED');
CREATE TABLE "NfcComanda" (
 "id" UUID NOT NULL, "restaurantId" INTEGER NOT NULL, "customerId" UUID NOT NULL,
 "cardId" UUID, "tableNumber" INTEGER, "status" "NfcComandaStatus" NOT NULL DEFAULT 'OPEN',
 "openRequestKeyHash" CHAR(64) NOT NULL, "totalCents" BIGINT NOT NULL DEFAULT 0,
 "paidCents" BIGINT NOT NULL DEFAULT 0, "openedByUserId" INTEGER NOT NULL,
 "closedByUserId" INTEGER, "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
 "dueAt" TIMESTAMPTZ(3) NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
 "closedAt" TIMESTAMPTZ(3), "paidAt" TIMESTAMPTZ(3),
 "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "NfcComanda_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "NfcComanda_balance_check" CHECK ("totalCents" >= 0 AND "paidCents" >= 0 AND "paidCents" <= "totalCents"),
 CONSTRAINT "NfcComanda_tableNumber_check" CHECK ("tableNumber" IS NULL OR "tableNumber" > 0)
);
CREATE UNIQUE INDEX "NfcComanda_id_restaurantId_key" ON "NfcComanda"("id","restaurantId");
CREATE UNIQUE INDEX "NfcComanda_restaurantId_customerId_openRequestKeyHash_key" ON "NfcComanda"("restaurantId","customerId","openRequestKeyHash");
CREATE INDEX "NfcComanda_restaurantId_customerId_status_idx" ON "NfcComanda"("restaurantId","customerId","status");
CREATE INDEX "NfcComanda_restaurantId_status_openedAt_idx" ON "NfcComanda"("restaurantId","status","openedAt");
CREATE UNIQUE INDEX "NfcComanda_one_open_per_customer_idx" ON "NfcComanda"("restaurantId","customerId") WHERE "status" = 'OPEN';
ALTER TABLE "NfcComanda" ADD CONSTRAINT "NfcComanda_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT;
ALTER TABLE "NfcComanda" ADD CONSTRAINT "NfcComanda_customerId_restaurantId_fkey" FOREIGN KEY ("customerId","restaurantId") REFERENCES "NfcCustomer"("id","restaurantId") ON DELETE RESTRICT;
ALTER TABLE "NfcComanda" ADD CONSTRAINT "NfcComanda_cardId_restaurantId_fkey" FOREIGN KEY ("cardId","restaurantId") REFERENCES "NfcCard"("id","restaurantId") ON DELETE RESTRICT;
CREATE TABLE "NfcComandaItem" (
 "id" UUID NOT NULL, "restaurantId" INTEGER NOT NULL, "comandaId" UUID NOT NULL,
 "kind" "NfcComandaItemKind" NOT NULL, "sourceOrderId" INTEGER,
 "description" VARCHAR(160) NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1,
 "unitPriceCents" BIGINT NOT NULL, "totalCents" BIGINT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
 CONSTRAINT "NfcComandaItem_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "NfcComandaItem_amount_check" CHECK ("quantity" > 0 AND "unitPriceCents" >= 0 AND "totalCents" >= 0)
);
CREATE UNIQUE INDEX "NfcComandaItem_restaurantId_sourceOrderId_key" ON "NfcComandaItem"("restaurantId","sourceOrderId");
CREATE INDEX "NfcComandaItem_restaurantId_comandaId_createdAt_idx" ON "NfcComandaItem"("restaurantId","comandaId","createdAt");
ALTER TABLE "NfcComandaItem" ADD CONSTRAINT "NfcComandaItem_comandaId_restaurantId_fkey" FOREIGN KEY ("comandaId","restaurantId") REFERENCES "NfcComanda"("id","restaurantId") ON DELETE RESTRICT;
CREATE TABLE "NfcComandaPayment" (
 "id" UUID NOT NULL, "restaurantId" INTEGER NOT NULL, "comandaId" UUID NOT NULL,
 "amountCents" BIGINT NOT NULL, "method" "PaymentMethod" NOT NULL,
 "status" "NfcComandaPaymentStatus" NOT NULL DEFAULT 'PENDING',
 "requestKeyHash" CHAR(64) NOT NULL, "requestFingerprint" CHAR(64) NOT NULL,
 "recordedByUserId" INTEGER NOT NULL, "confirmedByUserId" INTEGER,
 "confirmedAt" TIMESTAMPTZ(3), "reversedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
 "updatedAt" TIMESTAMPTZ(3) NOT NULL,
 CONSTRAINT "NfcComandaPayment_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "NfcComandaPayment_amount_check" CHECK ("amountCents" > 0)
);
CREATE UNIQUE INDEX "NfcComandaPayment_restaurantId_comandaId_requestKeyHash_key" ON "NfcComandaPayment"("restaurantId","comandaId","requestKeyHash");
CREATE INDEX "NfcComandaPayment_restaurantId_comandaId_status_idx" ON "NfcComandaPayment"("restaurantId","comandaId","status");
ALTER TABLE "NfcComandaPayment" ADD CONSTRAINT "NfcComandaPayment_comandaId_restaurantId_fkey" FOREIGN KEY ("comandaId","restaurantId") REFERENCES "NfcComanda"("id","restaurantId") ON DELETE RESTRICT;
-- Additional defense in depth: fail closed without transaction-local tenant context.
DO $ DECLARE table_name TEXT; BEGIN
 FOREACH table_name IN ARRAY ARRAY['NfcComanda','NfcComandaItem','NfcComandaPayment'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',table_name);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',table_name);
 EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO PUBLIC USING ("restaurantId" = CASE WHEN current_setting(''app.restaurant_id'', true) ~ ''^[1-9][0-9]*$'' THEN current_setting(''app.restaurant_id'', true)::integer ELSE NULL END) WITH CHECK ("restaurantId" = CASE WHEN current_setting(''app.restaurant_id'', true) ~ ''^[1-9][0-9]*$'' THEN current_setting(''app.restaurant_id'', true)::integer ELSE NULL END)',table_name||'_tenant_isolation',table_name);
 END LOOP;
END $$;
