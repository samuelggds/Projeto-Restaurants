import orderRepository from '../repositories/OrderRepository.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { OrderStateMachine } from '../state/orderStateMachine.js';
import { OrderPermissions } from '../permissions/orderPermissions.js';
import {
  FuncionarioSubRole,
  OrderRefundStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  UserRole,
} from '@prisma/client';
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
import { verifyDeliveryConfirmationCode } from '../utils/deliveryConfirmationCode.js';

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
    const normalizedRole = String(role || '').toUpperCase() as UserRole;
    const normalizedSubRole = String(actorSubRole || '').toUpperCase();
    const isWaiter =
      normalizedRole === UserRole.FUNCIONARIO && normalizedSubRole === FuncionarioSubRole.GARCOM;
    const isAttendant =
      normalizedRole === UserRole.FUNCIONARIO && normalizedSubRole === FuncionarioSubRole.ATENDENTE;
    const order = isWaiter
      ? await orderRepository.findDeliverableTableOrderById(orderId, restaurantId)
      : await orderRepository.findById(orderId, restaurantId);

    if (!order) {
      throw new Error(
        isWaiter
          ? 'Pedido não encontrado em uma sessão de mesa ativa para entrega.'
          : 'Pedido não encontrado!',
      );
    }

    const currentStatus = order.status;
    if (
      isWaiter &&
      !(
        order.type === OrderType.MESA &&
        currentStatus === OrderStatus.PRONTO &&
        status === OrderStatus.ENTREGUE
      )
    ) {
      throw new Error('O garçom só pode marcar como entregue um pedido de mesa que esteja pronto.');
    }
    if (
      isAttendant &&
      !(
        order.type === OrderType.RETIRADA &&
        currentStatus === OrderStatus.PRONTO &&
        status === OrderStatus.ENTREGUE
      )
    ) {
      throw new Error('O atendente só pode concluir a retirada de um pedido que esteja pronto.');
    }
    if (!OrderStateMachine.canTransition(currentStatus, status)) {
      throw new Error(`Transição inválida: ${currentStatus} → ${status} `);
    }
    if (!OrderPermissions.canUserChangeStatus(normalizedRole, status, actorSubRole)) {
      throw new Error('Usuário não tem permissão para isso!');
    }

    const courierId = Number(actorUserId || 0);
    if (normalizedRole === UserRole.MOTOQUEIRO) {
      await courierAccessService.assertActiveCourier(courierId, Number(restaurantId));
      if (order.type !== OrderType.DELIVERY) {
        throw new Error('Motoqueiros só podem atualizar pedidos de entrega.');
      }
      if (order.assignedCourierId !== courierId) {
        throw new Error('Esta entrega não está atribuída a você.');
      }
    }

    const digitalMethods: PaymentMethod[] = [PaymentMethod.PIX, PaymentMethod.CARTAO];
    const isPayOnDelivery =
      order.payOnDelivery === true || this.hasLegacyPayOnDeliveryMarker(order.observation);
    const isDigitalPayment = !!order.paymentMethod && digitalMethods.includes(order.paymentMethod);
    const isCourierDeliveryCompletion =
      status === OrderStatus.ENTREGUE &&
      normalizedRole === UserRole.MOTOQUEIRO &&
      order.type === OrderType.DELIVERY;

    if (isCourierDeliveryCompletion) {
      if (currentStatus !== OrderStatus.SAIU_PARA_ENTREGA) {
        throw new Error('A entrega só pode ser concluída depois que o pedido sair para entrega.');
      }
      if (order.paid !== true) {
        throw new Error('O pagamento precisa estar confirmado antes de concluir a entrega.');
      }
      const providedCode = String(deliveryConfirmationCode || '').replace(/\D/g, '');
      if (!/^\d{4}$/u.test(providedCode)) {
        throw new Error('Informe o código de 4 dígitos exibido para o cliente.');
      }
      if (!order.publicId || !order.deliveryStartedAt) {
        throw new Error('Código de entrega indisponível para este pedido.');
      }
      if (
        !verifyDeliveryConfirmationCode(providedCode, {
          orderId: Number(order.id),
          publicId: String(order.publicId),
          deliveryStartedAt: order.deliveryStartedAt,
        })
      ) {
        throw new Error('Código de entrega inválido. Confira com o cliente e tente novamente.');
      }
    }

    if (status === OrderStatus.ENTREGUE && order.type === OrderType.RETIRADA && order.paid !== true) {
      throw new Error('Confirme o pagamento antes de concluir a retirada do pedido.');
    }

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
        let deliveredOrder;

        if (isCourierDeliveryCompletion) {
          const result = await tx.order.updateMany({
            where: {
              id: Number(orderId),
              restaurantId,
              type: OrderType.DELIVERY,
              status: OrderStatus.SAIU_PARA_ENTREGA,
              assignedCourierId: courierId,
              paid: true,
              deliveredAt: null,
              refundStatus: {
                notIn: [OrderRefundStatus.PROCESSING, OrderRefundStatus.SUCCEEDED],
              },
            },
            data: {
              status: OrderStatus.ENTREGUE,
              deliveredAt: new Date(),
            },
          });

          if (result.count !== 1) {
            const current = await orderRepository.findById(orderId, restaurantId, tx);
            if (!current) throw new Error('Pedido não encontrado!');
            if (current.status === OrderStatus.ENTREGUE) {
              throw new Error('Esta entrega já foi concluída. Atualize a tela.');
            }
            if (current.assignedCourierId !== courierId) {
              throw new Error('Esta entrega não está atribuída a você.');
            }
            if (current.paid !== true) {
              throw new Error('O pagamento precisa estar confirmado antes de concluir a entrega.');
            }
            throw new Error(
              'O pedido foi atualizado por outro processo. Atualize a tela e tente novamente.',
            );
          }

          deliveredOrder = await orderRepository.findById(orderId, restaurantId, tx);
          if (!deliveredOrder) throw new Error('Pedido não encontrado após a atualização.');
        } else {
          deliveredOrder = await orderRepository.updateStatusIfCurrent(
            orderId,
            status,
            restaurantId,
            { status: currentStatus, paid: order.paid },
            tx,
          );
          await tx.order.updateMany({
            where: {
              id: Number(orderId),
              restaurantId,
              status: OrderStatus.ENTREGUE,
              deliveredAt: null,
            },
            data: { deliveredAt: new Date() },
          });
          deliveredOrder = await orderRepository.findById(orderId, restaurantId, tx);
          if (!deliveredOrder) throw new Error('Pedido não encontrado após a atualização.');
        }

        if (normalizedRole === UserRole.ADMIN && order.type === OrderType.DELIVERY) {
          await tx.auditLog.create({
            data: {
              restaurantId,
              userId: actorUserId || null,
              userRole: normalizedRole,
              action: 'ORDER_DELIVERY_ADMIN_COMPLETED',
              resource: 'Order',
              metadata: {
                orderId: Number(order.id),
                previousStatus: currentStatus,
                paid: order.paid === true,
                assignedCourierId: order.assignedCourierId ?? null,
              },
            },
          });
        }

        if (deliveredOrder.paid === true) {
          await markCouponRedemptionUsedForOrder(orderId, restaurantId, tx);
        }
        return deliveredOrder;
      });
    } else if (status === OrderStatus.SAIU_PARA_ENTREGA && order.type === OrderType.DELIVERY) {
      updatedOrder = await prisma.$transaction(async (tx) => {
        let startedOrder = await orderRepository.updateStatusIfCurrent(
          orderId,
          status,
          restaurantId,
          { status: currentStatus, paid: order.paid },
          tx,
        );

        if (!startedOrder.deliveryStartedAt) {
          await tx.order.updateMany({
            where: {
              id: Number(orderId),
              restaurantId,
              type: OrderType.DELIVERY,
              status: OrderStatus.SAIU_PARA_ENTREGA,
              deliveryStartedAt: null,
            },
            data: { deliveryStartedAt: new Date() },
          });
          startedOrder = await orderRepository.findById(orderId, restaurantId, tx);
          if (!startedOrder) throw new Error('Pedido não encontrado após iniciar a entrega.');
        }

        return startedOrder;
      });
    } else {
      updatedOrder = await orderRepository.updateStatusIfCurrent(orderId, status, restaurantId, {
        status: currentStatus,
        paid: order.paid,
      });
    }

    void notifyCustomerOrderStatusChanged({
      restaurantId,
      customerPhone: updatedOrder?.user?.phone || order.user?.phone,
      customerName: updatedOrder?.user?.name || order.user?.name,
      restaurantName: updatedOrder?.restaurant?.name || order.restaurant?.name,
      restaurantWhatsapp: updatedOrder?.restaurant?.whatsapp || order.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      publicId: updatedOrder?.publicId,
      orderType: updatedOrder?.type,
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
