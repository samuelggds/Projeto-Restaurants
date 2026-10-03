ALTER TABLE "RestaurantManagedUpdateRequest"
DROP CONSTRAINT IF EXISTS "RestaurantManagedUpdateRequest_requestedByUserId_fkey";

ALTER TABLE "RestaurantManagedUpdateRequest"
DROP CONSTRAINT IF EXISTS "RestaurantManagedUpdateRequest_requestedByUserId_restaurantId_fkey";

ALTER TABLE "RestaurantManagedUpdateRequest"
ADD CONSTRAINT "RestaurantManagedUpdateRequest_requestedByUserId_restaurantId_fkey"
FOREIGN KEY ("requestedByUserId", "restaurantId")
REFERENCES "User"("id", "restaurantId")
ON DELETE RESTRICT
ON UPDATE CASCADE;
