ALTER TABLE "RestaurantSettings"
ADD COLUMN "customDomainRequested" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RestaurantSettings"
ADD COLUMN "landingPageEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "RestaurantCustomDomain"
ADD COLUMN "landingPublished" BOOLEAN NOT NULL DEFAULT false;
