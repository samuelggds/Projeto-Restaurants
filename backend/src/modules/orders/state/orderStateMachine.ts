import { OrderStatus } from '@prisma/client';

const transitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDENTE]: [OrderStatus.PREPARANDO, OrderStatus.CANCELADO],

  [OrderStatus.PREPARANDO]: [OrderStatus.PRONTO],

  [OrderStatus.PRONTO]: [OrderStatus.SAIU_PARA_ENTREGA, OrderStatus.ENTREGUE],

  [OrderStatus.SAIU_PARA_ENTREGA]: [OrderStatus.ENTREGUE],

  [OrderStatus.ENTREGUE]: [],
  [OrderStatus.CANCELADO]: [],
};

function canTransition(from: OrderStatus, to: OrderStatus) {
  const allowed = transitions[from] || [];
  return allowed.includes(to);
}

export const OrderStateMachine = {
  transitions,
  canTransition,
};
