CREATE TABLE "RestaurantRemoteSupport" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "requesterId" INTEGER NOT NULL,
  "approverId" INTEGER,
  "reason" VARCHAR(500) NOT NULL,
  "device" VARCHAR(24) NOT NULL DEFAULT 'WINDOWS',
  "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "closedAt" TIMESTAMPTZ(3),
  "quickAssistCode" VARCHAR(6),
  "codeExpiresAt" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RestaurantRemoteSupport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RestaurantRemoteSupport_restaurantId_status_expiresAt_idx"
ON "RestaurantRemoteSupport" ("restaurantId", "status", "expiresAt");
CREATE INDEX "RestaurantRemoteSupport_requesterId_requestedAt_idx"
ON "RestaurantRemoteSupport" ("requesterId", "requestedAt");
CREATE UNIQUE INDEX "RestaurantRemoteSupport_one_open_idx"
ON "RestaurantRemoteSupport" ("restaurantId") WHERE "status" IN ('PENDING', 'APPROVED');
ALTER TABLE "RestaurantRemoteSupport" ADD CONSTRAINT "RestaurantRemoteSupport_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantRemoteSupport" ADD CONSTRAINT "RestaurantRemoteSupport_requesterId_fkey"
FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RestaurantRemoteSupport" ADD CONSTRAINT "RestaurantRemoteSupport_approverId_restaurantId_fkey"
FOREIGN KEY ("approverId", "restaurantId") REFERENCES "User"("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
