-- CreateEnum
CREATE TYPE "OrderIssueSenderType" AS ENUM ('CLIENT', 'ADMIN');

-- CreateTable
CREATE TABLE "OrderIssueThread" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "orderStatus" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "total" DECIMAL(10,2) NOT NULL,
    "orderCreatedAt" TIMESTAMP(3) NOT NULL,
    "addressLabel" TEXT,
    "itemsSummary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByName" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderIssueThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderIssueMessage" (
    "id" SERIAL NOT NULL,
    "threadId" INTEGER NOT NULL,
    "senderType" "OrderIssueSenderType" NOT NULL,
    "senderName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderIssueMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderIssueThread_orderId_key" ON "OrderIssueThread"("orderId");

-- CreateIndex
CREATE INDEX "OrderIssueThread_restaurantId_updatedAt_idx" ON "OrderIssueThread"("restaurantId", "updatedAt");

-- CreateIndex
CREATE INDEX "OrderIssueThread_userId_updatedAt_idx" ON "OrderIssueThread"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "OrderIssueMessage_threadId_sentAt_idx" ON "OrderIssueMessage"("threadId", "sentAt");

-- AddForeignKey
ALTER TABLE "OrderIssueThread" ADD CONSTRAINT "OrderIssueThread_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIssueThread" ADD CONSTRAINT "OrderIssueThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIssueThread" ADD CONSTRAINT "OrderIssueThread_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderIssueMessage" ADD CONSTRAINT "OrderIssueMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "OrderIssueThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
