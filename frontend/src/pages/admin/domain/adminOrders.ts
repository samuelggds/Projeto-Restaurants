import type { AdminOrder } from '../types';

export const ORDER_STATUSES = [
  'PENDENTE',
  'PREPARANDO',
  'PRONTO',
  'SAIU_PARA_ENTREGA',
  'ENTREGUE',
  'CANCELADO',
] as const;

const NEXT_ORDER_STATUSES: Record<string, string[]> = {
  PENDENTE: ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['PRONTO'],
  PRONTO: ['SAIU_PARA_ENTREGA', 'ENTREGUE'],
  SAIU_PARA_ENTREGA: ['ENTREGUE'],
};

export function getNextOrderStatuses(status: string) {
  return NEXT_ORDER_STATUSES[status] ?? [];
}

export function filterAdminOrders(orders: AdminOrder[], search: string, status: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  return orders.filter((order) => {
    if (status && order.status !== status) return false;
    if (!normalizedSearch) return true;
    return `${order.id} ${order.customerName}`
      .toLocaleLowerCase('pt-BR')
      .includes(normalizedSearch);
  });
}
