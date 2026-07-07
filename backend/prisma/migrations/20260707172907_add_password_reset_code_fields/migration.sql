-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetPasswordCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resetPasswordCodeHash" TEXT;
