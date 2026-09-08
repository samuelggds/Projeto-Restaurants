ALTER TABLE "Order"
  ADD COLUMN "creationRequestKey" TEXT,
  ADD COLUMN "creationActor" TEXT,
  ADD COLUMN "creationFingerprint" TEXT;

CREATE UNIQUE INDEX "Order_restaurantId_creationActor_creationRequestKey_key"
  ON "Order"("restaurantId", "creationActor", "creationRequestKey");

ALTER TABLE "Order" ADD CONSTRAINT "Order_creation_request_complete"
  CHECK (("creationRequestKey" IS NULL AND "creationActor" IS NULL AND "creationFingerprint" IS NULL)
    OR ("creationRequestKey" IS NOT NULL AND "creationActor" IS NOT NULL AND "creationFingerprint" IS NOT NULL));
