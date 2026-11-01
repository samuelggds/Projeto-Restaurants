CREATE TABLE "NfcServiceCall" (
 "id" UUID NOT NULL,
 "restaurantId" INTEGER NOT NULL,
 "cardId" UUID NOT NULL,
 "comandaId" UUID NOT NULL,
 "tableNumber" INTEGER,
 "status" "TableServiceCallStatus" NOT NULL DEFAULT 'WAITING',
 "assignedToId" INTEGER,
 "resolvedById" INTEGER,
 "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "assignedAt" TIMESTAMPTZ(3),
 "resolvedAt" TIMESTAMPTZ(3),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "NfcServiceCall_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NfcServiceCall_id_restaurantId_key" ON "NfcServiceCall"("id","restaurantId");
CREATE INDEX "NfcServiceCall_restaurantId_status_requestedAt_idx" ON "NfcServiceCall"("restaurantId","status","requestedAt");
CREATE INDEX "NfcServiceCall_restaurantId_cardId_requestedAt_idx" ON "NfcServiceCall"("restaurantId","cardId","requestedAt");
CREATE INDEX "NfcServiceCall_restaurantId_comandaId_status_idx" ON "NfcServiceCall"("restaurantId","comandaId","status");
CREATE UNIQUE INDEX "NfcServiceCall_one_active_per_comanda_idx" ON "NfcServiceCall"("restaurantId","comandaId") WHERE "status" IN ('WAITING','IN_PROGRESS');
ALTER TABLE "NfcServiceCall" ADD CONSTRAINT "NfcServiceCall_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NfcServiceCall" ADD CONSTRAINT "NfcServiceCall_cardId_restaurantId_fkey" FOREIGN KEY ("cardId","restaurantId") REFERENCES "NfcCard"("id","restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NfcServiceCall" ADD CONSTRAINT "NfcServiceCall_comandaId_restaurantId_fkey" FOREIGN KEY ("comandaId","restaurantId") REFERENCES "NfcComanda"("id","restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NfcServiceCall" ADD CONSTRAINT "NfcServiceCall_assignedToId_restaurantId_fkey" FOREIGN KEY ("assignedToId","restaurantId") REFERENCES "User"("id","restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NfcServiceCall" ADD CONSTRAINT "NfcServiceCall_resolvedById_restaurantId_fkey" FOREIGN KEY ("resolvedById","restaurantId") REFERENCES "User"("id","restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NfcServiceCall" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NfcServiceCall" FORCE ROW LEVEL SECURITY;
CREATE POLICY "NfcServiceCall_tenant_isolation" ON "NfcServiceCall"
 USING ("restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$' THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END)
 WITH CHECK ("restaurantId" = CASE WHEN current_setting('app.restaurant_id',true) ~ '^[1-9][0-9]*$' THEN current_setting('app.restaurant_id',true)::integer ELSE NULL END);
