ALTER TABLE "RestaurantSettings"
ADD COLUMN "landingPageEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RestaurantCustomDomain"
ADD COLUMN "landingPublished" BOOLEAN NOT NULL DEFAULT false;
