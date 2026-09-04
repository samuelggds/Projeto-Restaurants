-- Delivery payment automation for Pix-at-delivery and integrated card terminals.
CREATE TABLE "PaymentTerminal" (
  "id" SERIAL PRIMARY KEY,
  "publicId" TEXT NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "providerTerminalId" TEXT NOT NULL,
  "posId" TEXT,
  "storeId" TEXT,
  "externalPosId" TEXT,
  "operatingMode" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "assignedCourierId" INTEGER,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentTerminal_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentTerminal_assignedCourierId_fkey"
    FOREIGN KEY ("assignedCourierId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "PaymentTerminal_publicId_key"
  ON "PaymentTerminal"("publicId");
CREATE UNIQUE INDEX "PaymentTerminal_restaurant_provider_terminal_key"
  ON "PaymentTerminal"("restaurantId", "provider", "providerTerminalId");
CREATE UNIQUE INDEX "PaymentTerminal_restaurant_courier_key"
  ON "PaymentTerminal"("restaurantId", "assignedCourierId")
  WHERE "assignedCourierId" IS NOT NULL;
CREATE INDEX "PaymentTerminal_restaurant_active_idx"
  ON "PaymentTerminal"("restaurantId", "active", "provider");

CREATE TABLE "PaymentTerminalAssignment" (
  "id" SERIAL PRIMARY KEY,
  "restaurantId" INTEGER NOT NULL,
  "terminalId" INTEGER NOT NULL,
  "courierId" INTEGER NOT NULL,
  "assignedByUserId" INTEGER NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unassignedAt" TIMESTAMP(3),
  CONSTRAINT "PaymentTerminalAssignment_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentTerminalAssignment_terminalId_fkey"
    FOREIGN KEY ("terminalId") REFERENCES "PaymentTerminal"("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentTerminalAssignment_courierId_fkey"
    FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE RESTRICT,
  CONSTRAINT "PaymentTerminalAssignment_assignedByUserId_fkey"
    FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT
);

CREATE INDEX "PaymentTerminalAssignment_terminal_assigned_idx"
  ON "PaymentTerminalAssignment"("terminalId", "assignedAt");
CREATE INDEX "PaymentTerminalAssignment_courier_assigned_idx"
  ON "PaymentTerminalAssignment"("restaurantId", "courierId", "assignedAt");

CREATE TABLE "DeliveryPayment" (
  "id" SERIAL PRIMARY KEY,
  "publicId" TEXT NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "orderId" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "providerPaymentId" TEXT,
  "providerOrderId" TEXT,
  "terminalId" INTEGER,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "lastProviderStatus" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryPayment_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  CONSTRAINT "DeliveryPayment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
  CONSTRAINT "DeliveryPayment_terminalId_fkey"
    FOREIGN KEY ("terminalId") REFERENCES "PaymentTerminal"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "DeliveryPayment_publicId_key"
  ON "DeliveryPayment"("publicId");
CREATE UNIQUE INDEX "DeliveryPayment_orderId_key"
  ON "DeliveryPayment"("orderId");
CREATE UNIQUE INDEX "DeliveryPayment_provider_order_key"
  ON "DeliveryPayment"("provider", "providerOrderId")
  WHERE "providerOrderId" IS NOT NULL;
CREATE UNIQUE INDEX "DeliveryPayment_provider_payment_key"
  ON "DeliveryPayment"("provider", "providerPaymentId")
  WHERE "providerPaymentId" IS NOT NULL;
CREATE INDEX "DeliveryPayment_restaurant_status_idx"
  ON "DeliveryPayment"("restaurantId", "status", "createdAt");
