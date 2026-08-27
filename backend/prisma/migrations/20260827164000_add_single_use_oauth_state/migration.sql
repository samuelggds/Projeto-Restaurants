CREATE TABLE "OAuthAuthorizationState" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAuthorizationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthAuthorizationState_nonceHash_key"
ON "OAuthAuthorizationState"("nonceHash");
CREATE UNIQUE INDEX "OAuthAuthorizationState_provider_userId_key"
ON "OAuthAuthorizationState"("provider", "userId");
CREATE INDEX "OAuthAuthorizationState_expiresAt_idx"
ON "OAuthAuthorizationState"("expiresAt");
CREATE INDEX "OAuthAuthorizationState_restaurantId_provider_idx"
ON "OAuthAuthorizationState"("restaurantId", "provider");

ALTER TABLE "OAuthAuthorizationState"
ADD CONSTRAINT "OAuthAuthorizationState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OAuthAuthorizationState"
ADD CONSTRAINT "OAuthAuthorizationState_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
