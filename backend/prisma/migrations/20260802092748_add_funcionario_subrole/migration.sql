/*
  Warnings:

  - The values [COZINHA,GARCOM] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "FuncionarioSubRole" AS ENUM ('COZINHA', 'GARCOM');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'FUNCIONARIO', 'CLIENTE', 'MOTOQUEIRO');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CLIENTE';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subRole" "FuncionarioSubRole";
