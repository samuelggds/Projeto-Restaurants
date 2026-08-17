import { OrderStatus, OrderType, UserRole } from '@prisma/client';

type ConfirmableOrder = {
  userId: number;
  type: OrderType;
  status: OrderStatus;
  deliveryConfirmedAt?: Date | null;
};

export function canConfirmDeliveryReceipt(
  order: ConfirmableOrder,
  customerId: number,
  role: UserRole | string,
) {
  if (String(role).toUpperCase() !== UserRole.CLIENTE) {
    throw new Error('Somente o cliente do pedido pode confirmar o recebimento.');
  }

  if (order.userId !== customerId) {
    throw new Error('Pedido não encontrado.');
  }

  if (order.type !== OrderType.DELIVERY) {
    throw new Error('A confirmação de recebimento é exclusiva para pedidos de entrega.');
  }

  if (order.status !== OrderStatus.ENTREGUE) {
    throw new Error('O pedido ainda não foi marcado como entregue.');
  }

  return !order.deliveryConfirmedAt;
}
