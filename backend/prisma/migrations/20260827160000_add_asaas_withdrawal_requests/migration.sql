CREATE TABLE "AsaasWithdrawalRequest" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "requestedByUserId" INTEGER NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "pixKeyHash" TEXT NOT NULL,
    "pixKeyLastFour" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "providerTransferId" TEXT,
    "providerStatus" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsaasWithdrawalRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AsaasWithdrawalRequest_publicId_key"
ON "AsaasWithdrawalRequest"("publicId");
CREATE UNIQUE INDEX "AsaasWithdrawalRequest_providerTransferId_key"
ON "AsaasWithdrawalRequest"("providerTransferId");
CREATE INDEX "AsaasWithdrawalRequest_restaurantId_status_createdAt_idx"
ON "AsaasWithdrawalRequest"("restaurantId", "status", "createdAt");
CREATE INDEX "AsaasWithdrawalRequest_status_expiresAt_idx"
ON "AsaasWithdrawalRequest"("status", "expiresAt");

ALTER TABLE "AsaasWithdrawalRequest"
ADD CONSTRAINT "AsaasWithdrawalRequest_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AsaasWithdrawalRequest"
ADD CONSTRAINT "AsaasWithdrawalRequest_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
