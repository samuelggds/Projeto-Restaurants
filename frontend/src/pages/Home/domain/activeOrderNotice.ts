export type ActiveOrderNotice = {
  id: string;
  status: string;
  summary: string;
  statusLabel: string;
};

const ACTIVE_STATUSES = new Set(['PENDENTE', 'PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA']);

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pedido confirmado',
  PREPARANDO: 'Em preparo',
  PRONTO: 'Pronto para entrega',
  SAIU_PARA_ENTREGA: 'Saiu para entrega',
  ENTREGUE: 'Entrega realizada',
};

function orderSummary(order: Record<string, unknown>) {
  const items = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];

  if (!items.length) return 'Seu pedido está em andamento';

  const product = items[0]?.product as Record<string, unknown> | undefined;
  const firstItem = String(product?.name || items[0]?.name || 'Item');
  return items.length > 1
    ? `${firstItem} + ${items.length - 1} ${items.length === 2 ? 'item' : 'itens'}`
    : firstItem;
}

export function getActiveOrderNotice(orders: Record<string, unknown>[]): ActiveOrderNotice | null {
  const deliveryOrders = orders.filter(
    (order) =>
      String(order.type || '')
        .trim()
        .toUpperCase() === 'DELIVERY',
  );

  const latestOrder = [...deliveryOrders].sort(
    (first, second) =>
      new Date(String(second.createdAt || 0)).getTime() -
      new Date(String(first.createdAt || 0)).getTime(),
  )[0];

  if (!latestOrder || latestOrder.id == null) {
    return null;
  }

  const status = String(latestOrder.status || '').toUpperCase();

  const awaitsReceiptConfirmation = status === 'ENTREGUE' && !latestOrder.deliveryConfirmedAt;

  if (!ACTIVE_STATUSES.has(status) && !awaitsReceiptConfirmation) {
    return null;
  }

  return {
    id: String(latestOrder.id),
    status,
    summary: orderSummary(latestOrder),
    statusLabel: STATUS_LABELS[status] || 'Pedido em andamento',
  };
}
