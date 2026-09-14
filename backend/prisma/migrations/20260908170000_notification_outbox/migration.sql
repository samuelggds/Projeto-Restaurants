CREATE TABLE "NotificationOutbox" (
  "id" UUID PRIMARY KEY,
  "deduplicationKey" VARCHAR(64) NOT NULL UNIQUE,
  "restaurantId" INTEGER NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'DELIVERED', 'FAILED', 'DISCARDED')),
  "payload" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedUntil" TIMESTAMPTZ(3),
  "lockToken" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3)
);
CREATE INDEX "NotificationOutbox_status_availableAt_idx" ON "NotificationOutbox" ("status", "availableAt");
CREATE INDEX "NotificationOutbox_createdAt_idx" ON "NotificationOutbox" ("createdAt");
