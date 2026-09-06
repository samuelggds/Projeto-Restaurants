import { UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import orderRepository from '../repositories/OrderRepository.js';
import { canConfirmDeliveryReceipt } from '../utils/deliveryReceiptConfirmation.js';

class ConfirmOrderDeliveryReceivedService {
  async execute({
    orderId,
    restaurantId,
    customerId,
    role,
    guestPublicId,
  }: {
    orderId: string | number;
    restaurantId: number;
    customerId: number;
    role: UserRole | string;
    guestPublicId?: string | null;
  }) {
    const normalizedOrderId = Number(orderId);
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido.');
    }

    const normalizedGuestPublicId = String(guestPublicId || '').trim();
    const isGuestCustomer = Boolean(normalizedGuestPublicId);
    const isCustomer = String(role).toUpperCase() === UserRole.CLIENTE;

    let order;
    let effectiveCustomerId = Number(customerId || 0);

    if (isGuestCustomer) {
      const guestOrder = await prisma.order.findFirst({
        where: {
          id: normalizedOrderId,
          publicId: normalizedGuestPublicId,
        },
        select: {
          id: true,
          publicId: true,
          restaurantId: true,
          userId: true,
          type: true,
          status: true,
          deliveryConfirmedAt: true,
        },
      });
      if (!guestOrder) throw new Error('Pedido não encontrado.');
      order = guestOrder;
      effectiveCustomerId = guestOrder.userId;
    } else {
      order = isCustomer
        ? await orderRepository.findByIdForCustomer(normalizedOrderId, effectiveCustomerId)
        : await orderRepository.findById(normalizedOrderId, restaurantId);
    }

    if (!order) {
      throw new Error('Pedido não encontrado.');
    }

    const shouldNotify = canConfirmDeliveryReceipt(order, effectiveCustomerId, role);
    const updatedOrder = shouldNotify
      ? await orderRepository.confirmDeliveryReceived(normalizedOrderId, order.restaurantId)
      : await orderRepository.findById(normalizedOrderId, order.restaurantId);

    if (!updatedOrder) {
      throw new Error('Não foi possível confirmar o recebimento do pedido.');
    }

    if (shouldNotify) {
      const payload = {
        ...updatedOrder,
        deliveryConfirmedByCustomer: true,
      };
      const tenantRoom = `restaurant:${updatedOrder.restaurantId}`;
      io.to(tenantRoom).emit('order:delivery-confirmed', payload);
      io.to(tenantRoom).emit('order:status-changed', payload);
      if (updatedOrder.userId) {
        io.to(`user:${updatedOrder.userId}`).emit('order:delivery-confirmed', payload);
      }
    }

    return updatedOrder;
  }
}

export default new ConfirmOrderDeliveryReceivedService();
