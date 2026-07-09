-- CreateTable
CREATE TABLE "AuthRefreshSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginLockout" (
    "id" SERIAL NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginLockout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthRefreshSession_userId_key" ON "AuthRefreshSession"("userId");

-- CreateIndex
CREATE INDEX "AuthRefreshSession_jti_idx" ON "AuthRefreshSession"("jti");

-- CreateIndex
CREATE INDEX "AuthRefreshSession_expiresAt_idx" ON "AuthRefreshSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoginLockout_emailNormalized_key" ON "LoginLockout"("emailNormalized");

-- CreateIndex
CREATE INDEX "LoginLockout_lockUntil_idx" ON "LoginLockout"("lockUntil");

-- AddForeignKey
ALTER TABLE "AuthRefreshSession" ADD CONSTRAINT "AuthRefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
