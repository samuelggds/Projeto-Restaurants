-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentProof" TEXT,
ADD COLUMN     "paymentProofImage" TEXT;

-- AlterTable
ALTER TABLE "RestaurantSettings" ADD COLUMN     "pixProvider" TEXT NOT NULL DEFAULT 'MERCADO_PAGO';
