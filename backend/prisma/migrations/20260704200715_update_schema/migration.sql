/*
  Warnings:

  - You are about to drop the column `splitRate` on the `Order` table. All the data in the column will be lost.
  - Made the column `systemFee` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'CANCELADO';

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "splitRate",
ALTER COLUMN "systemFee" SET NOT NULL,
ALTER COLUMN "systemFee" SET DEFAULT 0;
