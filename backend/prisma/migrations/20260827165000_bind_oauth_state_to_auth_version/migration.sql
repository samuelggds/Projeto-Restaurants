ALTER TABLE "OAuthAuthorizationState"
ADD COLUMN "authVersion" INTEGER;

UPDATE "OAuthAuthorizationState" AS oauth_state
SET "authVersion" = app_user."authVersion"
FROM "User" AS app_user
WHERE app_user."id" = oauth_state."userId";

ALTER TABLE "OAuthAuthorizationState"
ALTER COLUMN "authVersion" SET NOT NULL;
