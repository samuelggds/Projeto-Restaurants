-- Pedidos acima da capacidade configurada deixam de ser recusados.
-- capacityQueuedAt registra a entrada FIFO na fila de espera; capacityAdmittedAt
-- marca quando o pedido recebeu uma vaga operacional.
ALTER TABLE "Order"
  ADD COLUMN "capacityQueuedAt" TIMESTAMP(3),
  ADD COLUMN "capacityAdmittedAt" TIMESTAMP(3);

CREATE INDEX "Order_restaurantId_capacityQueuedAt_capacityAdmittedAt_createdAt_idx"
  ON "Order"("restaurantId", "capacityQueuedAt", "capacityAdmittedAt", "createdAt");
