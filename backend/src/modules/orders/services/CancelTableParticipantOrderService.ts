import { OrderRefundStatus, OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { io } from '../../../server.js';
import { notifyCustomerOrderStatusChanged } from '../../../services/customerNotifier.js';
import orderRepository from '../repositories/OrderRepository.js';
import { OrderStateMachine } from '../state/orderStateMachine.js';
import {
  emitTableSessionOrderEvent,
  emitWaiterTableOrderEvent,
} from '../utils/waiterOrderRealtime.js';
import cancelOrderWorkflowService, {
  OrderCancellationError,
  requiresAutomaticOrderRefund,
} from './CancelOrderWorkflowService.js';
import tableAccountSettingsRepository from '../../tableAccount/repositories/TableAccountSettingsRepository.js';

const publicOrderIdSchema = z.string().uuid();

class CancelTableParticipantOrderService {
  async execute(input: {
    publicOrderId: unknown;
    tableSessionId: number;
    restaurantId: number;
    participantId: number;
  }) {
    const parsedPublicOrderId = publicOrderIdSchema.safeParse(input.publicOrderId);
    const tableSessionId = Number(input.tableSessionId);
    const restaurantId = Number(input.restaurantId);
    const participantId = Number(input.participantId);
    if (
      !parsedPublicOrderId.success ||
      !Number.isSafeInteger(tableSessionId) ||
      tableSessionId <= 0 ||
      !Number.isSafeInteger(restaurantId) ||
      restaurantId <= 0 ||
      !Number.isSafeInteger(participantId) ||
      participantId <= 0
    ) {
      throw new OrderCancellationError('Pedido não encontrado!');
    }

    const order = await orderRepository.findByPublicIdForTableParticipant(
      parsedPublicOrderId.data,
      tableSessionId,
      restaurantId,
      participantId,
    );
    if (!order) {
      // A mesma resposta é usada para inexistente, outro participante e outro
      // tenant para não revelar a existência do pedido.
      throw new OrderCancellationError('Pedido não encontrado!');
    }

    if (order.status === OrderStatus.CANCELADO) {
      if (
        !requiresAutomaticOrderRefund(order) ||
        order.refundStatus === OrderRefundStatus.SUCCEEDED
      ) {
        return order;
      }
      throw new OrderCancellationError(
        'Este pedido já está cancelado, mas o estorno automático ainda não foi confirmado.',
      );
    }

    const isPreparing = order.status === OrderStatus.PREPARANDO;
    if (isPreparing) {
      const settings = await tableAccountSettingsRepository.findByRestaurantId(restaurantId);
      if (settings.requireEmployeeApprovalForPreparedItemCancellation) {
        throw new OrderCancellationError(
          'Este pedido já está em preparo e precisa da autorização de um funcionário para ser cancelado.',
        );
      }
    } else if (!OrderStateMachine.canTransition(order.status, OrderStatus.CANCELADO)) {
      throw new OrderCancellationError('Pedido não pode ser cancelado!');
    }

    const { order: updatedOrder } = await cancelOrderWorkflowService.execute(order);

    notifyCustomerOrderStatusChanged({
      restaurantId,
      customerPhone: order.user?.phone,
      customerName: order.user?.name || order.participant?.displayName,
      restaurantName: order.restaurant?.name,
      restaurantWhatsapp: order.restaurant?.whatsapp,
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    }).catch((error: unknown) => {
      console.error(
        '[TABLE_ORDER_STATUS_NOTIFICATION_UNHANDLED]',
        error instanceof Error ? error.message : String(error),
      );
    });

    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', updatedOrder);
    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);
    }
    emitWaiterTableOrderEvent(io, 'order:status-changed', updatedOrder);
    emitTableSessionOrderEvent(io, 'order:status-changed', updatedOrder);

    return updatedOrder;
  }
}

export default new CancelTableParticipantOrderService();
