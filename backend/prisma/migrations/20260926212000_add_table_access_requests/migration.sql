CREATE TYPE "TableAccessRequestStatus" AS ENUM ('WAITING', 'APPROVED', 'REJECTED', 'CONSUMED', 'EXPIRED');

CREATE TABLE "TableAccessRequest" (
  "id" SERIAL NOT NULL,
  "publicId" TEXT NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "tableId" INTEGER NOT NULL,
  "tableSessionId" INTEGER NOT NULL,
  "displayName" VARCHAR(100) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "requestTokenHash" VARCHAR(64) NOT NULL,
  "status" "TableAccessRequestStatus" NOT NULL DEFAULT 'WAITING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "decidedById" INTEGER,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TableAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TableAccessRequest_publicId_key" ON "TableAccessRequest"("publicId");
CREATE UNIQUE INDEX "TableAccessRequest_requestTokenHash_key" ON "TableAccessRequest"("requestTokenHash");
CREATE INDEX "TableAccessRequest_restaurantId_status_createdAt_idx" ON "TableAccessRequest"("restaurantId", "status", "createdAt");
CREATE INDEX "TableAccessRequest_tableSessionId_status_idx" ON "TableAccessRequest"("tableSessionId", "status");
CREATE INDEX "TableAccessRequest_tableId_status_idx" ON "TableAccessRequest"("tableId", "status");

ALTER TABLE "TableAccessRequest"
  ADD CONSTRAINT "TableAccessRequest_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TableAccessRequest"
  ADD CONSTRAINT "TableAccessRequest_tableSessionId_restaurantId_fkey"
  FOREIGN KEY ("tableSessionId", "restaurantId") REFERENCES "TableSession"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TableAccessRequest"
  ADD CONSTRAINT "TableAccessRequest_tableId_restaurantId_fkey"
  FOREIGN KEY ("tableId", "restaurantId") REFERENCES "Table"("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TableAccessRequest"
  ADD CONSTRAINT "TableAccessRequest_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
