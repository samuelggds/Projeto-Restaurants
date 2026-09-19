CREATE TYPE "ProductPricingMode" AS ENUM ('BASE', 'HIGHEST_OPTION');

ALTER TABLE "Product"
ADD COLUMN "pricingMode" "ProductPricingMode" NOT NULL DEFAULT 'BASE';
