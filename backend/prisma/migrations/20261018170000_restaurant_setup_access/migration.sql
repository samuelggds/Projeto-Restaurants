CREATE TABLE "RestaurantSetupAccess" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "requesterId" INTEGER NOT NULL,
  "decidedById" INTEGER,
  "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  "reason" VARCHAR(500) NOT NULL,
  "requestedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "RestaurantSetupAccess_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RestaurantSetupAccess_restaurantId_status_expiresAt_idx" ON "RestaurantSetupAccess"("restaurantId", "status", "expiresAt");
CREATE INDEX "RestaurantSetupAccess_requesterId_status_idx" ON "RestaurantSetupAccess"("requesterId", "status");
ALTER TABLE "RestaurantSetupAccess" ADD CONSTRAINT "RestaurantSetupAccess_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantSetupAccess" ADD CONSTRAINT "RestaurantSetupAccess_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RestaurantSetupAccess" ADD CONSTRAINT "RestaurantSetupAccess_decidedById_restaurantId_fkey" FOREIGN KEY ("decidedById","restaurantId") REFERENCES "User"("id","restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "RestaurantSetupAccess_one_active_idx" ON "RestaurantSetupAccess"("restaurantId") WHERE "status" IN ('PENDING', 'APPROVED');
