/*
  Warnings:

  - A unique constraint covering the columns `[restaurantId,code]` on the table `Coupon` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[restaurantId,month,year]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dueDate` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_restaurantId_fkey";

-- DropIndex
DROP INDEX "Coupon_code_key";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "dueDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "paidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "feeCollected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "splitRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "systemFee" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "balanceDebt" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_restaurantId_code_key" ON "Coupon"("restaurantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_restaurantId_month_year_key" ON "Invoice"("restaurantId", "month", "year");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
