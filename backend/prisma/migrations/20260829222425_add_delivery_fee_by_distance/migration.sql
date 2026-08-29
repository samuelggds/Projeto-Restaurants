-- CreateEnum
CREATE TYPE "DeliveryFeeMode" AS ENUM ('FIXED', 'DISTANCE');

-- DropIndex
DROP INDEX "Restaurant_accessBlockReason_active_idx";

-- DropIndex
DROP INDEX "SupportChatMessage_restaurantId_senderRole_sentAt_idx";

-- DropIndex
DROP INDEX "User_role_active_restaurantId_idx";

-- AlterTable
ALTER TABLE "Coupon" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlatformPlan" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PlatformSettings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RestaurantSettings" ADD COLUMN     "deliveryFeeMode" "DeliveryFeeMode" NOT NULL DEFAULT 'FIXED';

-- AlterTable
ALTER TABLE "ScheduledJobState" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "DeliveryFeeRange" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "maxDistanceKm" DECIMAL(6,2) NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryFeeRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryFeeRange_restaurantId_active_maxDistanceKm_idx" ON "DeliveryFeeRange"("restaurantId", "active", "maxDistanceKm");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryFeeRange_restaurantId_maxDistanceKm_key" ON "DeliveryFeeRange"("restaurantId", "maxDistanceKm");

-- RenameForeignKey
ALTER TABLE "Order" RENAME CONSTRAINT "Order_participantId_fkey" TO "Order_participantId_tableSessionId_restaurantId_fkey";

-- RenameForeignKey
ALTER TABLE "Order" RENAME CONSTRAINT "Order_tableSessionId_fkey" TO "Order_tableSessionId_restaurantId_fkey";

-- RenameForeignKey
ALTER TABLE "OrderItem" RENAME CONSTRAINT "OrderItem_participantId_fkey" TO "OrderItem_participantId_tableSessionId_restaurantId_fkey";

-- RenameForeignKey
ALTER TABLE "TableBillItem" RENAME CONSTRAINT "TableBillItem_orderId_fkey" TO "TableBillItem_orderId_restaurantId_tableSessionId_particip_fkey";

-- RenameForeignKey
ALTER TABLE "TableBillItem" RENAME CONSTRAINT "TableBillItem_orderItemId_fkey" TO "TableBillItem_orderItemId_orderId_restaurantId_tableSessio_fkey";

-- RenameForeignKey
ALTER TABLE "TableBillItem" RENAME CONSTRAINT "TableBillItem_participantId_fkey" TO "TableBillItem_participantId_tableSessionId_restaurantId_fkey";

-- RenameForeignKey
ALTER TABLE "TableBillItem" RENAME CONSTRAINT "TableBillItem_tableSessionId_fkey" TO "TableBillItem_tableSessionId_restaurantId_fkey";

-- RenameForeignKey
ALTER TABLE "TableParticipant" RENAME CONSTRAINT "TableParticipant_tableSessionId_fkey" TO "TableParticipant_tableSessionId_restaurantId_fkey";

-- RenameForeignKey
ALTER TABLE "TablePaymentAllocation" RENAME CONSTRAINT "TablePaymentAllocation_paymentIntentId_fkey" TO "TablePaymentAllocation_paymentIntentId_restaurantId_tableS_fkey";

-- RenameForeignKey
ALTER TABLE "TablePaymentAllocation" RENAME CONSTRAINT "TablePaymentAllocation_tableBillItemId_fkey" TO "TablePaymentAllocation_tableBillItemId_restaurantId_tableS_fkey";

-- RenameForeignKey
ALTER TABLE "TablePaymentAllocation" RENAME CONSTRAINT "TablePaymentAllocation_tableSessionId_fkey" TO "TablePaymentAllocation_tableSessionId_restaurantId_fkey";

-- RenameForeignKey
ALTER TABLE "TablePaymentEvent" RENAME CONSTRAINT "TablePaymentEvent_paymentIntentId_fkey" TO "TablePaymentEvent_paymentIntentId_restaurantId_tableSessio_fkey";

-- RenameForeignKey
ALTER TABLE "TablePaymentEvent" RENAME CONSTRAINT "TablePaymentEvent_tableSessionId_fkey" TO "TablePaymentEvent_tableSessionId_restaurantId_fkey";

-- RenameForeignKey
ALTER TABLE "TablePaymentIntent" RENAME CONSTRAINT "TablePaymentIntent_payerParticipantId_fkey" TO "TablePaymentIntent_payerParticipantId_tableSessionId_resta_fkey";

-- RenameForeignKey
ALTER TABLE "TablePaymentIntent" RENAME CONSTRAINT "TablePaymentIntent_tableSessionId_fkey" TO "TablePaymentIntent_tableSessionId_restaurantId_fkey";

-- RenameForeignKey
ALTER TABLE "TableSession" RENAME CONSTRAINT "TableSession_tableId_fkey" TO "TableSession_tableId_restaurantId_fkey";

-- AddForeignKey
ALTER TABLE "DeliveryFeeRange" ADD CONSTRAINT "DeliveryFeeRange_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "OrderItem_id_orderId_restaurantId_tableSessionId_participantId_" RENAME TO "OrderItem_id_orderId_restaurantId_tableSessionId_participan_key";

-- RenameIndex
ALTER INDEX "TablePaymentIntent_restaurantId_tableSessionId_idempotencyKeyHa" RENAME TO "TablePaymentIntent_restaurantId_tableSessionId_idempotencyK_key";

-- RenameIndex
ALTER INDEX "TablePaymentIntent_restaurantId_tableSessionId_status_expiresAt" RENAME TO "TablePaymentIntent_restaurantId_tableSessionId_status_expir_idx";

-- RenameIndex
ALTER INDEX "TablePaymentIntent_status_expiresAt_restaurantId_tableSessionId" RENAME TO "TablePaymentIntent_status_expiresAt_restaurantId_tableSessi_idx";
