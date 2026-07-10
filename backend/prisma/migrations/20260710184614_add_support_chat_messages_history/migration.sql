-- CreateEnum
CREATE TYPE "SupportChatSenderRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "SupportChatMessage" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "senderUserId" INTEGER,
    "senderRole" "SupportChatSenderRole" NOT NULL,
    "senderLabel" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportChatMessage_restaurantId_sentAt_idx" ON "SupportChatMessage"("restaurantId", "sentAt");

-- CreateIndex
CREATE INDEX "SupportChatMessage_senderUserId_sentAt_idx" ON "SupportChatMessage"("senderUserId", "sentAt");

-- AddForeignKey
ALTER TABLE "SupportChatMessage" ADD CONSTRAINT "SupportChatMessage_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportChatMessage" ADD CONSTRAINT "SupportChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
