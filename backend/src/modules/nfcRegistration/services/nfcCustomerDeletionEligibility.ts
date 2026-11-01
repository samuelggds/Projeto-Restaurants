import type { Prisma } from '@prisma/client';

/**
 * A customer may leave the operational registry only after the physical
 * card has been returned and every visit has been completely settled.
 * Always recheck inside the same transaction that archives the customer.
 */
export async function nfcCustomerDeletionEligibility(
  tx: Prisma.TransactionClient,
  restaurantId: number,
  customerId: string,
): Promise<{ eligible: boolean; reason: string | null }> {
  const linkedCard = await tx.nfcCard.findFirst({
    where: { restaurantId, customerId },
    select: { id: true },
  });
  if (linkedCard) {
    return { eligible: false, reason: 'O cliente ainda possui cartão vinculado. Confirme a quitação e a devolução do cartão antes de excluir.' };
  }

  const comandas = await tx.nfcComanda.findMany({
    where: { restaurantId, customerId },
    select: { id: true, status: true, totalCents: true, paidCents: true },
  });
  if (comandas.some(comanda => comanda.status !== 'PAID' || comanda.paidCents < comanda.totalCents)) {
    return { eligible: false, reason: 'Há comanda aberta, pendente ou não integralmente quitada para este cliente.' };
  }

  const comandaIds = comandas.map(comanda => comanda.id);
  if (!comandaIds.length) return { eligible: true, reason: null };

  const [pendingLedger, pendingGateway, pendingOrders, activeCalls] = await Promise.all([
    tx.nfcComandaPayment.count({
      where: { restaurantId, comandaId: { in: comandaIds }, status: 'PENDING' },
    }),
    tx.nfcCashlessPayment.count({
      where: { restaurantId, comandaId: { in: comandaIds }, status: { in: ['RESERVED', 'PROCESSING'] } },
    }),
    tx.nfcOrderConfirmation.count({
      where: { restaurantId, comandaId: { in: comandaIds }, consumedAt: null, expiresAt: { gt: new Date() } },
    }),
    tx.nfcServiceCall.count({
      where: { restaurantId, comandaId: { in: comandaIds }, status: { in: ['WAITING', 'IN_PROGRESS'] } },
    }),
  ]);
  if (pendingLedger || pendingGateway || pendingOrders || activeCalls) {
    return { eligible: false, reason: 'Existem pagamentos, pedidos ou chamados em processamento. Finalize as operações antes de excluir.' };
  }
  return { eligible: true, reason: null };
}
