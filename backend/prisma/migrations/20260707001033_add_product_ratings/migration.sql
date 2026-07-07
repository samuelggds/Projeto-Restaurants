-- CreateTable
CREATE TABLE "ProductRating" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "clientKey" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductRating_restaurantId_productId_idx" ON "ProductRating"("restaurantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRating_restaurantId_productId_clientKey_key" ON "ProductRating"("restaurantId", "productId", "clientKey");

-- AddForeignKey
ALTER TABLE "ProductRating" ADD CONSTRAINT "ProductRating_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRating" ADD CONSTRAINT "ProductRating_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
