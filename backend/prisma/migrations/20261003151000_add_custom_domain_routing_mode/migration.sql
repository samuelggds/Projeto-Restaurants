ALTER TABLE "RestaurantCustomDomain"
  ADD COLUMN "mode" VARCHAR(32) NOT NULL DEFAULT 'MENU_ONLY',
  ADD COLUMN "menuHostname" VARCHAR(253);

CREATE UNIQUE INDEX "RestaurantCustomDomain_menuHostname_key"
  ON "RestaurantCustomDomain" ("menuHostname")
  WHERE "menuHostname" IS NOT NULL;

ALTER TABLE "RestaurantCustomDomain"
  ADD CONSTRAINT "RestaurantCustomDomain_mode_check"
    CHECK ("mode" IN ('MENU_ONLY', 'SITE_WITH_MENU_SUBDOMAIN')),
  ADD CONSTRAINT "RestaurantCustomDomain_menu_hostname_lowercase_check"
    CHECK ("menuHostname" IS NULL OR "menuHostname" = lower("menuHostname")),
  ADD CONSTRAINT "RestaurantCustomDomain_mode_host_check"
    CHECK (
      ("mode" = 'MENU_ONLY' AND "menuHostname" IS NULL)
      OR
      ("mode" = 'SITE_WITH_MENU_SUBDOMAIN'
        AND "menuHostname" IS NOT NULL
        AND "menuHostname" <> "hostname")
    );
