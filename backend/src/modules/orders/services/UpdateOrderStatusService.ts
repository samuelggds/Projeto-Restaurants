import orderRepository from '../repositories/OrderRepository.js';
import { io } from '../../../server.js';
import { OrderStateMachine } from '../state/orderStateMachine.js';
import { OrderPermissions } from '../permissions/orderPermissions.js';
import { OrderStatus, OrderType, PaymentMethod, UserRole } from '@prisma/client';
import { notifyCustomerOrderStatusChanged } from '../../../services/customerNotifier.js';
import prisma from '../../../config/prisma.js';
import { restoreOrderItemsStock } from './restoreOrderItemsStock.js';
import {
  markCouponRedemptionUsedForOrder,
  releaseCouponRedemptionForOrder,
} from './couponRedemptionLifecycle.js';
import {
  emitTableSessionOrderEvent,
  emitWaiterTableOrderEvent,
} from '../utils/waiterOrderRealtime.js';
import courierAccessService from './CourierAccessService.js';

class UpdateOrderStatusService {
  private readonly PAY_ON_DELIVERY_MARKER = 'PAY_ON_DELIVERY:';

  private hasLegacyPayOnDeliveryMarker(observation: string | null | undefined) {
    return String(observation || '')
      .toUpperCase()
      .includes(this.PAY_ON_DELIVERY_MARKER);
  }

  async execute(
    orderId: number | string,
    restaurantId: number,
    status: OrderStatus,
    role: UserRole | string,
    deliveryConfirmationCode?: string,
    actorUserId?: number | null,
    actorSubRole?: string | null,
  ) {
    const order = await orderRepository.findById(orderId, restaurantId);

    if (!order) {
      throw new Error('Pedido não encontrado!');
    }

    const currentStatus = order.status;

    const canChange = OrderStateMachine.canTransition(currentStatus, status);

    if (!canChange) {
      throw new Error(`Transição inválida: ${currentStatus} → ${status} `);
    }

    const normalizedRole = String(role || '').toUpperCase() as UserRole;
    const canUserChange = OrderPermissions.canUserChangeStatus(
      normalizedRole,
      status,
      actorSubRole,
    );

    if (!canUserChange) {
      throw new Error('Usuário não tem permissão para isso!');
    }

    if (normalizedRole === UserRole.MOTOQUEIRO) {
      await courierAccessService.assertActiveCourier(
        Number(actorUserId || 0),
        Number(restaurantId),
      );
      if (order.type !== OrderType.DELIVERY) {
        throw new Error('Motoqueiros só podem atualizar pedidos de entrega.');
      }
      if (order.assignedCourierId !== Number(actorUserId || 0)) {
        throw new Error('Esta entrega não está atribuída a você.');
      }
    }

    if (
      status === OrderStatus.ENTREGUE &&
      normalizedRole === UserRole.MOTOQUEIRO &&
      order.type === OrderType.DELIVERY
    ) {
      const customerPhoneDigits = String(order?.user?.phone || '').replace(/\D/g, '');
      const expectedCode = customerPhoneDigits.slice(-4);
      const providedCode = String(deliveryConfirmationCode || '').replace(/\D/g, '');

      if (!customerPhoneDigits || customerPhoneDigits.length < 4) {
        throw new Error(
          'Não é possível confirmar a entrega: cliente sem telefone válido cadastrado.',
        );
      }

      if (!/^\d{4}$/.test(providedCode)) {
        throw new Error(
          'Informe os 4 últimos dígitos do celular do cliente para concluir a entrega.',
        );
      }

      if (providedCode !== expectedCode) {
        throw new Error('Código de confirmação inválido para esta entrega.');
      }
    }

    const digitalMethods: PaymentMethod[] = [PaymentMethod.PIX, PaymentMethod.CARTAO];
    const isPayOnDelivery =
      order.payOnDelivery === true || this.hasLegacyPayOnDeliveryMarker(order?.observation);
    const isDigitalPayment = !!order.paymentMethod && digitalMethods.includes(order.paymentMethod);

    const isUnpaidDigitalOrderBlocked = isDigitalPayment && !isPayOnDelivery && order.paid !== true;

    if (
      status === OrderStatus.CANCELADO &&
      isDigitalPayment &&
      !isPayOnDelivery &&
      order.paid === true
    ) {
      throw new Error(
        'Pedido pago online deve ser cancelado pelo fluxo de estorno para devolver o valor ao cliente.',
      );
    }

    if (
      isUnpaidDigitalOrderBlocked &&
      status !== OrderStatus.PENDENTE &&
      status !== OrderStatus.CANCELADO
    ) {
      throw new Error(
        'Pedido com pagamento digital pendente deve permanecer em PENDENTE até a confirmação do pagamento.',
      );
    }

    let updatedOrder;
    let paymentConfirmedOnDelivery = false;

    if (status === OrderStatus.CANCELADO) {
      updatedOrder = await prisma.$transaction(async (tx) => {
        const cancelledOrder = await orderRepository.updateStatusIfCurrent(
          orderId,
          status,
          restaurantId,
          { status: currentStatus, paid: order.paid },
          tx,
        );

        await restoreOrderItemsStock(tx, order);
        await releaseCouponRedemptionForOrder(orderId, restaurantId, tx);

        return cancelledOrder;
      });
    } else if (status === OrderStatus.ENTREGUE) {
      updatedOrder = await prisma.$transaction(async (tx) => {
        let deliveredOrder = await orderRepository.updateStatusIfCurrent(
          orderId,
          status,
          restaurantId,
          { status: currentStatus, paid: order.paid },
          tx,
        );

        if (!deliveredOrder) {
          throw new Error('Pedido não encontrado para atualizar.');
        }

        deliveredOrder = await tx.order.update({
          where: { id: deliveredOrder.id },
          data: { deliveredAt: new Date() },
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            restaurant: {
              select: { id: true, name: true, whatsapp: true },
            },
            table: {
              select: { id: true, number: true, active: true, restaurantId: true },
            },
            participant: {
              select: { id: true, publicId: true, displayName: true },
            },
            items: { include: { product: true } },
          },
        });

        if (
          (order.paymentMethod === PaymentMethod.DINHEIRO || isPayOnDelivery) &&
          deliveredOrder.paid !== true
        ) {
          paymentConfirmedOnDelivery = true;
          deliveredOrder = await orderRepository.confirmPayment(orderId, restaurantId, tx);
        }

        if (deliveredOrder?.paid === true) {
          await markCouponRedemptionUsedForOrder(orderId, restaurantId, tx);
        }

        return deliveredOrder;
      });
    } else {
      updatedOrder = await orderRepository.updateStatusIfCurrent(orderId, status, restaurantId, {
        status: currentStatus,
        paid: order.paid,
      });
    }

    if (paymentConfirmedOnDelivery && updatedOrder) {
      io.to(`restaurant:${restaurantId}`).emit('order:payment-confirmed', {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod,
      });

      if (updatedOrder.userId) {
        io.to(`user:${updatedOrder.userId}`).emit('order:payment-confirmed', {
          orderId: updatedOrder.id,
          paid: true,
          paymentMethod: updatedOrder.paymentMethod,
        });
      }
      emitTableSessionOrderEvent(io, 'order:payment-confirmed', updatedOrder);
    }

    notifyCustomerOrderStatusChanged({
      restaurantId,
      customerPhone: order?.user?.phone,
      customerName: order?.user?.name,
      restaurantName: order?.restaurant?.name,
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      status: updatedOrder?.status,
    }).catch((error: unknown) => {
      console.error(
        '[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]',
        error instanceof Error ? error.message : String(error),
      );
    });

    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', updatedOrder);
    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);
    }
    emitWaiterTableOrderEvent(io, 'waiter:order-updated', updatedOrder);
    emitTableSessionOrderEvent(io, 'order:status-changed', updatedOrder);
    return updatedOrder;
  }
}

export default new UpdateOrderStatusService();
