import { OrderStatus, OrderType, PaymentMethod } from '@prisma/client';
import { z } from 'zod';
import orderRepository from '../repositories/OrderRepository.js';
import reconcilePagBankCardPaymentService from './ReconcilePagBankCardPaymentService.js';
import asaasPaymentVerificationService from './AsaasPaymentVerificationService.js';
import finalizeOrderCardPaymentService from './FinalizeOrderCardPaymentService.js';

const publicOrderIdSchema = z.string().uuid();
const notFoundMessage = 'Pagamento com cartão não encontrado.';

type Input = {
  orderPublicId: unknown;
  restaurantId: number | string | null;
  userId?: number | string | null;
  tableSessionId?: number | string | null;
  participantId?: number | string | null;
  guest?: boolean;
};

class GetOrderCardPaymentStatusService {
  async execute(input: Input) {
    const parsedPublicId = publicOrderIdSchema.safeParse(input.orderPublicId);
    const restaurantId = Number(input.restaurantId || 0);
    if (!parsedPublicId.success || !Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
      throw new Error(notFoundMessage);
    }

    let order = await orderRepository.findCardPaymentStatusByPublicId(
      parsedPublicId.data,
      restaurantId,
    );
    if (!order || order.paymentMethod !== PaymentMethod.CARTAO || order.payOnDelivery === true) {
      throw new Error(notFoundMessage);
    }

    if (order.type === OrderType.MESA) {
      const tableSessionId = Number(input.tableSessionId || 0);
      const participantId = Number(input.participantId || 0);
      if (
        !Number.isSafeInteger(tableSessionId) ||
        !Number.isSafeInteger(participantId) ||
        order.tableSessionId !== tableSessionId ||
        order.participantId !== participantId
      ) {
        throw new Error(notFoundMessage);
      }
    } else if (order.userId) {
      if (order.userId !== Number(input.userId || 0)) {
        throw new Error(notFoundMessage);
      }
    } else if (!input.guest) {
      throw new Error(notFoundMessage);
    }

    const sessionId = String(order.cardCheckoutSessionId || '');
    if (
      !order.paid &&
      order.status !== OrderStatus.CANCELADO &&
      sessionId.startsWith('asaas_pay:')
    ) {
      try {
        const verified = await asaasPaymentVerificationService.execute({
          restaurantId: order.restaurantId,
          orderId: order.id,
          total: Number(order.total),
          method: 'CARTAO',
          paymentId: sessionId.slice('asaas_pay:'.length),
        });
        if (verified?.approved) {
          const confirmed = await finalizeOrderCardPaymentService.execute({
            orderId: order.id,
            restaurantId: order.restaurantId,
            checkoutSessionId: sessionId,
          });
          if (confirmed) order = { ...order, paid: confirmed.paid, status: confirmed.status };
        }
      } catch {
        /* Falha de consulta mantém o estado pendente; o webhook também concilia. */
      }
    }

    if (
      !order.paid &&
      order.status !== OrderStatus.CANCELADO &&
      (sessionId.startsWith('pagbank_checkout:') ||
        sessionId.startsWith('pagbank_charge:CHAR_') ||
        sessionId.startsWith('pagbank_tx:CHAR_'))
    ) {
      try {
        const confirmed = await reconcilePagBankCardPaymentService.execute({
          orderId: order.id,
          restaurantId,
        });
        if (confirmed) order = { ...order, paid: confirmed.paid, status: confirmed.status };
      } catch {
        /* A consulta não confirma pagamentos sem evidência; o webhook pode tentar novamente. */
      }
    }

    const status =
      order.status === OrderStatus.CANCELADO
        ? 'CANCELED'
        : order.paid === true
          ? 'PAID'
          : 'PENDING';

    return {
      orderPublicId: order.publicId,
      status,
      paid: status === 'PAID',
    } as const;
  }
}

export default new GetOrderCardPaymentStatusService();
