import type { AdminOrder } from '../types';

export const ADMIN_ORDER_STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente', PREPARANDO: 'Em preparo', PRONTO: 'Pronto',
  SAIU_PARA_ENTREGA: 'Saiu para entrega', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado',
};

export function formatOrderCreatedAt(value?: string) {
  if (!value) return 'Horário não informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Horário não informado';
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return date.toDateString() === new Date().toDateString()
    ? `Hoje, ${time}`
    : `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${time}`;
}

export function getRecordedOrderHistory(order: AdminOrder) {
  return [
    { date: order.createdAt, label: 'Pedido criado' },
    { date: order.paidAt, label: 'Pagamento confirmado' },
    { date: order.preparationStartedAt, label: 'Preparo iniciado' },
    { date: order.readyAt, label: 'Pedido pronto' },
    { date: order.deliveryStartedAt, label: 'Entrega iniciada' },
    { date: order.deliveredAt, label: 'Pedido concluído' },
    { date: order.refundedAt, label: 'Estorno concluído' },
  ].filter((event): event is { date: string; label: string } =>
    Boolean(event.date) && Number.isFinite(Date.parse(event.date || '')),
  ).sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
}
