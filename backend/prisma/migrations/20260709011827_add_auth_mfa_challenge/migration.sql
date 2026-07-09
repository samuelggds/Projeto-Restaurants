-- CreateTable
CREATE TABLE "AuthMfaChallenge" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthMfaChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthMfaChallenge_userId_key" ON "AuthMfaChallenge"("userId");

-- CreateIndex
CREATE INDEX "AuthMfaChallenge_expiresAt_idx" ON "AuthMfaChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "AuthMfaChallenge" ADD CONSTRAINT "AuthMfaChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
