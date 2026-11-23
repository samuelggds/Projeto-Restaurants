export type GuestOrder = Record<string, unknown>;

function money(value: unknown) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function statusLabel(value: unknown) {
  const status = String(value || '').toUpperCase();
  if (status === 'PREPARANDO') return 'Em preparo';
  if (status === 'PRONTO') return 'Pronto';
  if (status === 'SAIU_PARA_ENTREGA') return 'A caminho';
  if (status === 'ENTREGUE') return 'Entregue';
  if (status === 'CANCELADO') return 'Cancelado';
  return 'Confirmado';
}

function statusClass(value: unknown) {
  const status = String(value || '').toUpperCase();
  if (status === 'SAIU_PARA_ENTREGA') return 'on-the-way';
  if (status === 'ENTREGUE') return 'delivered';
  if (status === 'CANCELADO') return 'cancelled';
  return 'preparing';
}

function progressIndex(value: unknown) {
  const status = String(value || '').toUpperCase();
  if (status === 'ENTREGUE') return 3;
  if (status === 'SAIU_PARA_ENTREGA') return 2;
  if (status === 'PREPARANDO' || status === 'PRONTO') return 1;
  return 0;
}

export function orderSummary(order: GuestOrder) {
  const items = Array.isArray(order.items) ? order.items : [];
  return items
    .map((item) => {
      const record = (item || {}) as Record<string, unknown>;
      const product = (record.product || {}) as Record<string, unknown>;
      const quantity = Math.max(1, Number(record.quantity || 1));
      const name = String(product.name || record.productName || 'Item');
      return `${quantity}x ${name}`;
    })
    .join(', ');
}

function orderImage(order: GuestOrder) {
  const items = Array.isArray(order.items) ? order.items : [];
  const first = (items[0] || {}) as Record<string, unknown>;
  const product = (first.product || {}) as Record<string, unknown>;
  return String(product.image || '').trim();
}

function formatDate(value: unknown) {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = now.toDateString() === date.toDateString();
  const day = sameDay
    ? 'Hoje'
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${day} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export type GuestOrderCard = {
  id: number;
  date: string;
  summary: string;
  total: string;
  image?: string;
  statusLabel: string;
  statusClass: string;
  steps: readonly string[];
  current: number;
  action?: string;
};

export function toGuestOrderCard(order: GuestOrder): GuestOrderCard {
  const status = String(order.status || '').toUpperCase();
  const activeDelivery =
    String(order.type || '').toUpperCase() === 'DELIVERY' &&
    !['ENTREGUE', 'CANCELADO'].includes(status);
  return {
    id: Number(order.id || 0),
    date: formatDate(order.createdAt),
    image: orderImage(order),
    summary: orderSummary(order),
    total: money(order.total),
    statusLabel: statusLabel(status),
    statusClass: statusClass(status),
    steps: status === 'CANCELADO' ? [] : ['Confirmado', 'Em preparo', 'A caminho', 'Entregue'],
    current: progressIndex(status),
    action: activeDelivery ? 'Acompanhar em tempo real' : undefined,
  };
}
