import { OrderStatus, OrderType, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';

class RateDeliveredOrderService {
  async execute({
    orderId,
    customerId,
    role,
    guestPublicId,
    rating,
  }: {
    orderId: string | number;
    customerId: number;
    role: UserRole | string;
    guestPublicId?: string | null;
    rating: number | string;
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedRating = Number(rating);
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido.');
    }
    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      throw new Error('A avaliação deve ser um número inteiro entre 1 e 5.');
    }
    if (String(role || '').toUpperCase() !== UserRole.CLIENTE) {
      throw new Error('Somente o cliente deste pedido pode enviar a avaliação.');
    }

    const guestPublicId = String(guestPublicId || '').trim();
    const customer = Number(customerId || 0);
    const order = guestPublicId
      ? await prisma.order.findFirst({
          where: { id: normalizedOrderId, publicId: guestPublicId },
          select: {
            id: true,
            restaurantId: true,
            type: true,
            status: true,
            deliveryConfirmedAt: true,
          },
        })
      : await orderRepository.findByIdForCustomer(normalizedOrderId, customer);

    if (!order) throw new Error('Pedido não encontrado.');
    if (order.type !== OrderType.DELIVERY) {
      throw new Error('Avaliação disponível apenas para pedidos de delivery.');
    }
    if (order.status !== OrderStatus.ENTREGUE || !order.deliveryConfirmedAt) {
      throw new Error('Confirme o recebimento antes de avaliar o pedido.');
    }

    const result = await prisma.order.updateMany({
      where: {
        id: normalizedOrderId,
        restaurantId: Number(order.restaurantId),
        type: OrderType.DELIVERY,
        status: OrderStatus.ENTREGUE,
        deliveryConfirmedAt: { not: null },
      },
      data: {
        deliveryRating: normalizedRating,
        deliveryRatedAt: new Date(),
      },
    });
    if (result.count !== 1) throw new Error('Não foi possível salvar a avaliação deste pedido.');

    return prisma.order.findFirst({
      where: { id: normalizedOrderId, restaurantId: Number(order.restaurantId) },
      select: {
        id: true,
        restaurantId: true,
        deliveryRating: true,
        deliveryRatedAt: true,
      },
    });
  }
}

export default new RateDeliveredOrderService();
