CREATE TABLE "RestaurantCustomDomain" (
  "id" UUID NOT NULL,
  "restaurantId" INTEGER NOT NULL,
  "hostname" VARCHAR(253) NOT NULL,
  "includeWww" BOOLEAN NOT NULL DEFAULT true,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING_DNS',
  "verificationToken" VARCHAR(96) NOT NULL,
  "dnsVerifiedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "lastCheckError" VARCHAR(500),
  "createdByUserId" INTEGER,
  "updatedByUserId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RestaurantCustomDomain_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RestaurantCustomDomain_restaurantId_key" UNIQUE ("restaurantId"),
  CONSTRAINT "RestaurantCustomDomain_hostname_key" UNIQUE ("hostname"),
  CONSTRAINT "RestaurantCustomDomain_verificationToken_key" UNIQUE ("verificationToken"),
  CONSTRAINT "RestaurantCustomDomain_status_check"
    CHECK ("status" IN ('PENDING_DNS', 'DNS_VERIFIED', 'ACTIVE', 'DISABLED')),
  CONSTRAINT "RestaurantCustomDomain_hostname_lowercase_check"
    CHECK ("hostname" = lower("hostname"))
);

CREATE INDEX "RestaurantCustomDomain_status_hostname_idx"
  ON "RestaurantCustomDomain" ("status", "hostname");

ALTER TABLE "RestaurantCustomDomain"
  ADD CONSTRAINT "RestaurantCustomDomain_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
