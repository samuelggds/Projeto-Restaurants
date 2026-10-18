import { OrderStatus, PaymentMethod } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import orderPixPaymentService from '../services/OrderPixPaymentService.js';

const MINIMUM_ORDER_AGE_MS = 90_000;
// Limita consultas externas por execução; o job de expiração continua responsável
// pelo último estágio de conciliação e cancelamento dos Pix vencidos.
const MAX_PAYMENTS_PER_RUN = 40;

class OrderPendingPixPaymentReconciliationJob {
  async execute(now = new Date()) {
    const candidates = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDENTE,
        paid: false,
        payOnDelivery: false,
        paymentMethod: PaymentMethod.PIX,
        pixPaymentId: { not: null },
        createdAt: { lte: new Date(now.getTime() - MINIMUM_ORDER_AGE_MS) },
        pixExpiresAt: { gt: now },
      },
      select: {
        id: true,
        restaurantId: true,
        pixPaymentId: true,
      },
      // Prioriza cobranças recentes, que ainda podem ser entregues rapidamente
      // à cozinha. O sweep de expiração continua cobrindo os pedidos mais antigos.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: MAX_PAYMENTS_PER_RUN,
    });

    let checkedCount = 0;
    let confirmedCount = 0;
    const failures: Error[] = [];

    for (const candidate of candidates) {
      const paymentId = String(candidate.pixPaymentId || '').trim();
      if (!paymentId) continue;
      checkedCount++;

      try {
        // Somente consulta a cobrança original: NUNCA inicia novo pagamento.
        const remote = await orderPixPaymentService.getPaymentStatus({
          paymentId,
          restaurantId: candidate.restaurantId,
        });
        if (remote.sameRestaurant === false) {
          throw new Error('O pagamento Pix remoto pertence a outro restaurante.');
        }
        if (remote.isApproved !== true) continue;

        // O finalizador valida novamente o tenant, referência, valor e BRL e
        // usa trava/commit atômico; protege a corrida com cliente e webhooks.
        const order = await finalizeOrderPixPaymentService.execute({
          orderId: candidate.id,
          restaurantId: candidate.restaurantId,
          paymentId,
        });
        if (order?.paid === true) confirmedCount++;
      } catch (cause) {
        console.error('[PENDING_PIX_RECONCILIATION_FAILED]', {
          orderId: candidate.id,
          restaurantId: candidate.restaurantId,
          errorType: safeErrorName(cause),
        });
        failures.push(new Error('Falha ao reconciliar cobrança Pix pendente.', { cause }));
      }
    }

    if (failures.length) {
      throw new AggregateError(
        failures,
        'Conciliação de Pix ativos terminou com pagamentos ainda pendentes.',
      );
    }
    return { checkedCount, confirmedCount };
  }
}

export default new OrderPendingPixPaymentReconciliationJob();
