ALTER TABLE "RestaurantSettings"
ADD COLUMN "freeShippingMinimum" DECIMAL(10, 2),
ADD COLUMN "tableOrderingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "waiterCallEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "billRequestEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "whatsappDisplayName" TEXT;
