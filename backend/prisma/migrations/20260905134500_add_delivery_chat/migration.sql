CREATE TABLE "DeliveryChatThread" (
  "id" SERIAL PRIMARY KEY,
  "orderId" INTEGER NOT NULL UNIQUE,
  "restaurantId" INTEGER NOT NULL,
  "customerUserId" INTEGER,
  "courierId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "DeliveryChatThread_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
  CONSTRAINT "DeliveryChatThread_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  CONSTRAINT "DeliveryChatThread_customerUserId_fkey"
    FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL,
  CONSTRAINT "DeliveryChatThread_courierId_fkey"
    FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "DeliveryChatThread_restaurant_status_idx"
  ON "DeliveryChatThread"("restaurantId", "status", "updatedAt");
CREATE INDEX "DeliveryChatThread_courier_status_idx"
  ON "DeliveryChatThread"("courierId", "status", "updatedAt");

CREATE TABLE "DeliveryChatMessage" (
  "id" BIGSERIAL PRIMARY KEY,
  "threadId" INTEGER NOT NULL,
  "senderRole" TEXT NOT NULL,
  "senderUserId" INTEGER,
  "senderName" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryChatMessage_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES "DeliveryChatThread"("id") ON DELETE CASCADE,
  CONSTRAINT "DeliveryChatMessage_senderUserId_fkey"
    FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "DeliveryChatMessage_thread_created_idx"
  ON "DeliveryChatMessage"("threadId", "createdAt");
