CREATE TABLE "UserAddress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "complement" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserAddress_userId_idx" ON "UserAddress"("userId");
CREATE INDEX "UserAddress_userId_isDefault_idx" ON "UserAddress"("userId", "isDefault");
ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserAddress" ("userId", "label", "address", "number", "district", "city", "state", "zipCode", "complement", "isDefault", "updatedAt")
SELECT "id", 'Principal', "address", "number", "district", "city", "state", "zipCode", "complement", true, CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'CLIENTE'
  AND COALESCE(TRIM("address"), '') <> ''
  AND COALESCE(TRIM("number"), '') <> ''
  AND COALESCE(TRIM("district"), '') <> ''
  AND COALESCE(TRIM("city"), '') <> ''
  AND COALESCE(TRIM("state"), '') <> ''
  AND COALESCE(TRIM("zipCode"), '') <> '';
