CREATE TYPE "ProductSaleMode" AS ENUM ('COMPLETE', 'BUILDABLE');

ALTER TABLE "Product" ADD COLUMN "saleMode" "ProductSaleMode" NOT NULL DEFAULT 'COMPLETE';
ALTER TABLE "OrderItem" ADD COLUMN "ingredients" JSONB;

CREATE TABLE "ProductIngredient" (
  "id" SERIAL NOT NULL,
  "productId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductIngredient_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ProductIngredient_productId_active_idx" ON "ProductIngredient"("productId", "active");
