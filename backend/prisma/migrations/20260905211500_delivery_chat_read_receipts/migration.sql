ALTER TABLE "DeliveryChatMessage"
  ADD COLUMN "readAt" TIMESTAMP(3);

CREATE INDEX "DeliveryChatMessage_thread_role_read_idx"
  ON "DeliveryChatMessage"("threadId", "senderRole", "readAt", "createdAt");
