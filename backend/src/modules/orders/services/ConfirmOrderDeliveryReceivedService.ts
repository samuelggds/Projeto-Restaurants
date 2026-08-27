import { UserRole } from '@prisma/client';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import orderRepository from '../repositories/OrderRepository.js';
import { canConfirmDeliveryReceipt } from '../utils/deliveryReceiptConfirmation.js';

class ConfirmOrderDeliveryReceivedService {
  async execute({
    orderId,
    restaurantId,
    customerId,
    role,
  }: {
    orderId: string | number;
    restaurantId: number;
    customerId: number;
    role: UserRole | string;
  }) {
    const normalizedOrderId = Number(orderId);
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido.');
    }

    const isCustomer = String(role).toUpperCase() === UserRole.CLIENTE;
    const order = isCustomer
      ? await orderRepository.findByIdForCustomer(normalizedOrderId, customerId)
      : await orderRepository.findById(normalizedOrderId, restaurantId);
    if (!order) {
      throw new Error('Pedido não encontrado.');
    }

    const shouldNotify = canConfirmDeliveryReceipt(order, customerId, role);
    const updatedOrder = shouldNotify
      ? await orderRepository.confirmDeliveryReceived(normalizedOrderId, order.restaurantId)
      : order;

    if (!updatedOrder) {
      throw new Error('Não foi possível confirmar o recebimento do pedido.');
    }

    if (shouldNotify) {
      const payload = {
        ...updatedOrder,
        deliveryConfirmedByCustomer: true,
      };

      // O evento de status preserva a atualização em tempo real já consumida
      // pelos painéis administrativo e da cozinha.
      io.to(`restaurant:${restaurantId}`).emit('order:delivery-confirmed', payload);
      io.to(`restaurant:${restaurantId}`).emit('order:status-changed', payload);
      io.to(`user:${updatedOrder.userId}`).emit('order:delivery-confirmed', payload);
    }

    return updatedOrder;
  }
}

export default new ConfirmOrderDeliveryReceivedService();
