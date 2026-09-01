import { OrderStatus, OrderType, PaymentMethod } from '@prisma/client';
import { z } from 'zod';
import orderRepository from '../repositories/OrderRepository.js';

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

    const order = await orderRepository.findCardPaymentStatusByPublicId(
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
