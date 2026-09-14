import orderRepository from '../repositories/OrderRepository.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { OrderStateMachine } from '../state/orderStateMachine.js';
import { OrderPermissions } from '../permissions/orderPermissions.js';
import {
  FuncionarioSubRole,
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
import { setTenantDbContext } from '../../../database/tenantDbContext.js';

class UpdateOrderStatusService {
  private readonly PAY_ON_DELIVERY_MARKER = 'PAY_ON_DELIVERY:';

  private hasLegacyPayOnDeliveryMarker(observation: string | null | undefined) {
    return String(observation || '').toUpperCase().includes(this.PAY_ON_DELIVERY_MARKER);
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
    const normalizedActorUserId = Number(actorUserId || 0);
    const normalizedOrderId = Number(orderId);
    const isWaiter = normalizedRole === UserRole.FUNCIONARIO && normalizedSubRole === FuncionarioSubRole.GARCOM;
    const isAttendant = normalizedRole === UserRole.FUNCIONARIO && normalizedSubRole === FuncionarioSubRole.ATENDENTE;
    const order = isWaiter
      ? await orderRepository.findDeliverableTableOrderById(orderId, restaurantId)
      : await orderRepository.findById(orderId, restaurantId);

    if (!order) {
      throw new Error(isWaiter ? 'Pedido não encontrado em uma sessão de mesa ativa para entrega.' : 'Pedido não encontrado!');
    }

    const currentStatus = order.status;

    if (order.type === OrderType.DELIVERY && status === OrderStatus.ENTREGUE && currentStatus === OrderStatus.ENTREGUE) {
      if (normalizedRole === UserRole.MOTOQUEIRO) {
        await courierAccessService.assertActiveCourier(normalizedActorUserId, Number(restaurantId));
        if (Number(order.assignedCourierId || 0) !== normalizedActorUserId) throw new Error('Esta entrega não está atribuída a você.');
        return order;
      }
      if (normalizedRole === UserRole.ADMIN) {
        const activeAdmin = await prisma.user.findFirst({
          where: { id: normalizedActorUserId, restaurantId: Number(restaurantId), role: UserRole.ADMIN, active: true },
          select: { id: true },
        });
        if (!activeAdmin) throw new Error('Administrador não autorizado para este restaurante.');
        return order;
      }
    }

    if (isWaiter && !(order.type === OrderType.MESA && currentStatus === OrderStatus.PRONTO && status === OrderStatus.ENTREGUE)) {
      throw new Error('O garçom só pode marcar como entregue um pedido de mesa que esteja pronto.');
    }
    if (isAttendant && !(order.type === OrderType.RETIRADA && currentStatus === OrderStatus.PRONTO && status === OrderStatus.ENTREGUE)) {
      throw new Error('O atendente só pode concluir a retirada de um pedido que esteja pronto.');
    }
    if (!OrderStateMachine.canTransition(currentStatus, status)) throw new Error(`Transição inválida: ${currentStatus} → ${status} `);
    if (!OrderPermissions.canUserChangeStatus(normalizedRole, status, actorSubRole)) throw new Error('Usuário não tem permissão para isso!');

    if (normalizedRole === UserRole.MOTOQUEIRO) {
      await courierAccessService.assertActiveCourier(normalizedActorUserId, Number(restaurantId));
      if (order.type !== OrderType.DELIVERY) throw new Error('Motoqueiros só podem atualizar pedidos de entrega.');
      if (order.assignedCourierId !== normalizedActorUserId) throw new Error('Esta entrega não está atribuída a você.');
    }

    if (order.type === OrderType.DELIVERY && status === OrderStatus.SAIU_PARA_ENTREGA) {
      throw new Error('Inicie a entrega pelo fluxo de retirada do motoqueiro para registrar atribuição e código com segurança.');
    }

    const digitalMethods: PaymentMethod[] = [PaymentMethod.PIX, PaymentMethod.CARTAO];
    const isPayOnDelivery = order.payOnDelivery === true || this.hasLegacyPayOnDeliveryMarker(order.observation);
    const isDigitalPayment = !!order.paymentMethod && digitalMethods.includes(order.paymentMethod);
    const isCourierDeliveryCompletion = status === OrderStatus.ENTREGUE && normalizedRole === UserRole.MOTOQUEIRO && order.type === OrderType.DELIVERY;
    const isAdminDeliveryCompletion = status === OrderStatus.ENTREGUE && normalizedRole === UserRole.ADMIN && order.type === OrderType.DELIVERY;

    if (isCourierDeliveryCompletion || isAdminDeliveryCompletion) {
      if (currentStatus !== OrderStatus.SAIU_PARA_ENTREGA) throw new Error('A entrega só pode ser concluída quando estiver em SAIU_PARA_ENTREGA.');
      if (order.paid !== true) throw new Error('O pagamento precisa estar confirmado antes de concluir a entrega.');
      if (!order.deliveryStartedAt) throw new Error('A entrega não possui um início válido registrado.');
    }

    if (isCourierDeliveryCompletion) {
      const providedCode = String(deliveryConfirmationCode || '').replace(/\D/g, '');
      if (!/^\d{4}$/u.test(providedCode)) throw new Error('Informe o código de 4 dígitos exibido para o cliente.');
      if (!order.publicId) throw new Error('Código de entrega indisponível para este pedido.');
      if (!verifyDeliveryConfirmationCode(providedCode, { orderId: Number(order.id), publicId: String(order.publicId), deliveryStartedAt: order.deliveryStartedAt })) {
        throw new Error('Código de entrega inválido. Confira com o cliente e tente novamente.');
      }
    }

    if (status === OrderStatus.ENTREGUE && order.type === OrderType.RETIRADA && order.paid !== true) throw new Error('Confirme o pagamento antes de concluir a retirada do pedido.');

    const isUnpaidDigitalOrderBlocked = isDigitalPayment && !isPayOnDelivery && order.paid !== true;
    if (status === OrderStatus.CANCELADO && isDigitalPayment && !isPayOnDelivery && order.paid === true) {
      throw new Error('Pedido pago online deve ser cancelado pelo fluxo de estorno para devolver o valor ao cliente.');
    }
    if (isUnpaidDigitalOrderBlocked && status !== OrderStatus.PENDENTE && status !== OrderStatus.CANCELADO) {
      throw new Error('Pedido com pagamento digital pendente deve permanecer em PENDENTE até a confirmação do pagamento.');
    }

    let updatedOrder;
    if (status === OrderStatus.CANCELADO) {
      updatedOrder = await prisma.$transaction(async (tx) => {
        const cancelledOrder = await orderRepository.updateStatusIfCurrent(orderId, status, restaurantId, { status: currentStatus, paid: order.paid }, tx);
        await restoreOrderItemsStock(tx, order);
        await releaseCouponRedemptionForOrder(orderId, restaurantId, tx);
        return cancelledOrder;
      });
    } else if (isCourierDeliveryCompletion || isAdminDeliveryCompletion) {
      updatedOrder = await prisma.$transaction(async (tx) => {
        await setTenantDbContext(tx, Number(restaurantId));
        if (isCourierDeliveryCompletion) {
          await courierAccessService.assertActiveCourier(normalizedActorUserId, Number(restaurantId), tx);
        } else {
          const activeAdmin = await tx.user.findFirst({
            where: { id: normalizedActorUserId, restaurantId: Number(restaurantId), role: UserRole.ADMIN, active: true },
            select: { id: true, name: true },
          });
          if (!activeAdmin) throw new Error('Administrador não autorizado para este restaurante.');
        }

        const completed = await tx.order.updateMany({
          where: {
            id: normalizedOrderId,
            restaurantId: Number(restaurantId),
            type: OrderType.DELIVERY,
            status: OrderStatus.SAIU_PARA_ENTREGA,
            paid: true,
            deliveryStartedAt: { not: null },
            ...(isCourierDeliveryCompletion ? { assignedCourierId: normalizedActorUserId } : {}),
          },
          data: { status: OrderStatus.ENTREGUE, deliveredAt: new Date() },
        });

        if (completed.count !== 1) {
          const concurrentOrder = await orderRepository.findById(normalizedOrderId, Number(restaurantId), tx);
          if (concurrentOrder?.status === OrderStatus.ENTREGUE && (!isCourierDeliveryCompletion || Number(concurrentOrder.assignedCourierId || 0) === normalizedActorUserId)) {
            return { order: concurrentOrder, changed: false };
          }
          throw new Error('A entrega mudou enquanto era concluída. Atualize o pedido e confira pagamento, atribuição e status.');
        }

        const deliveredOrder = await orderRepository.findById(normalizedOrderId, Number(restaurantId), tx);
        if (!deliveredOrder) throw new Error('Pedido não encontrado para atualizar.');
        await markCouponRedemptionUsedForOrder(orderId, restaurantId, tx);

        if (isAdminDeliveryCompletion) {
          await tx.auditLog.create({
            data: {
              userId: normalizedActorUserId,
              userRole: UserRole.ADMIN,
              restaurantId: Number(restaurantId),
              restaurantName: deliveredOrder.restaurant?.name || order.restaurant?.name || null,
              action: 'ADMIN_DELIVERY_COMPLETED',
              resource: `Order:${normalizedOrderId}`,
              metadata: { previousStatus: currentStatus, paymentConfirmed: true, deliveryCodeBypassedByAdmin: true },
            },
          });
        }
        return { order: deliveredOrder, changed: true };
      });

      if (!updatedOrder.changed) return updatedOrder.order;
      updatedOrder = updatedOrder.order;
    } else if (status === OrderStatus.ENTREGUE) {
      updatedOrder = await prisma.$transaction(async (tx) => {
        let deliveredOrder = await orderRepository.updateStatusIfCurrent(orderId, status, restaurantId, { status: currentStatus, paid: order.paid }, tx);
        if (!deliveredOrder) throw new Error('Pedido não encontrado para atualizar.');
        deliveredOrder = await tx.order.update({
          where: { id: deliveredOrder.id },
          data: { deliveredAt: new Date() },
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            restaurant: { select: { id: true, name: true, whatsapp: true } },
            table: { select: { id: true, number: true, active: true, restaurantId: true } },
            participant: { select: { id: true, publicId: true, displayName: true } },
            items: { include: { product: true } },
          },
        });
        if (deliveredOrder?.paid === true) await markCouponRedemptionUsedForOrder(orderId, restaurantId, tx);
        return deliveredOrder;
      });
    } else {
      updatedOrder = await orderRepository.updateStatusIfCurrent(orderId, status, restaurantId, { status: currentStatus, paid: order.paid });
    }

    if (!updatedOrder) throw new Error('O pedido mudou enquanto era atualizado. Atualize a tela e tente novamente.');

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
      console.error('[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]', error instanceof Error ? error.message : String(error));
    });

    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', updatedOrder);
    if (updatedOrder.userId) io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);
    emitWaiterTableOrderEvent(io, 'waiter:order-updated', updatedOrder);
    emitTableSessionOrderEvent(io, 'order:status-changed', updatedOrder);
    return updatedOrder;
  }
}

export default new UpdateOrderStatusService();
