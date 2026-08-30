CREATE TABLE "CustomerPaymentMethod" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPaymentMethodId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "holderName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerPaymentMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerPaymentMethod_publicId_key" ON "CustomerPaymentMethod"("publicId");
CREATE UNIQUE INDEX "CustomerPaymentMethod_userId_restaurantId_provider_providerPaymentMethodId_key" ON "CustomerPaymentMethod"("userId", "restaurantId", "provider", "providerPaymentMethodId");
CREATE INDEX "CustomerPaymentMethod_userId_restaurantId_active_isDefault_idx" ON "CustomerPaymentMethod"("userId", "restaurantId", "active", "isDefault");
ALTER TABLE "CustomerPaymentMethod" ADD CONSTRAINT "CustomerPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentMethod" ADD CONSTRAINT "CustomerPaymentMethod_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
