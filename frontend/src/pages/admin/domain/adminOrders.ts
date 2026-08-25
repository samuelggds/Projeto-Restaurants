import type { AdminOrder } from '../types';

export const ORDER_STATUSES = [
  'PENDENTE',
  'PREPARANDO',
  'PRONTO',
  'SAIU_PARA_ENTREGA',
  'ENTREGUE',
  'CANCELADO',
] as const;

export type OrderPaymentTone = 'success' | 'warning' | 'neutral';

export type AdminOrdersSummary = {
  active: number;
  awaitingPayment: number;
  inProgress: number;
  delivered: number;
};

const TERMINAL_ORDER_STATUSES = new Set(['ENTREGUE', 'CANCELADO']);

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CARTAO: 'Cartão',
  CARD: 'Cartão',
  CREDIT_CARD: 'Cartão',
  DEBIT_CARD: 'Cartão',
  DINHEIRO: 'Dinheiro',
  CASH: 'Dinheiro',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  DELIVERY: 'Entrega',
  RETIRADA: 'Retirada no balcão',
  PICKUP: 'Retirada no balcão',
  MESA: 'Consumo na mesa',
  TABLE: 'Consumo na mesa',
  TABLE_SESSION: 'Consumo na mesa',
};

const ORDER_PROGRESS: Record<string, number> = {
  PENDENTE: 1,
  PREPARANDO: 2,
  PRONTO: 3,
  SAIU_PARA_ENTREGA: 4,
  ENTREGUE: 5,
};

const NEXT_ORDER_STATUSES: Record<string, string[]> = {
  PENDENTE: ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['PRONTO'],
  PRONTO: ['SAIU_PARA_ENTREGA', 'ENTREGUE'],
  SAIU_PARA_ENTREGA: ['ENTREGUE'],
};

export function getNextOrderStatuses(status: string) {
  return NEXT_ORDER_STATUSES[status] ?? [];
}

export function getAdminOrdersSummary(orders: AdminOrder[]): AdminOrdersSummary {
  return orders.reduce<AdminOrdersSummary>(
    (summary, order) => {
      const status = String(order.status || '').toUpperCase();
      if (!TERMINAL_ORDER_STATUSES.has(status)) summary.active += 1;
      if (!order.paid && status !== 'CANCELADO') summary.awaitingPayment += 1;
      if (['PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA'].includes(status)) {
        summary.inProgress += 1;
      }
      if (status === 'ENTREGUE') summary.delivered += 1;
      return summary;
    },
    { active: 0, awaitingPayment: 0, inProgress: 0, delivered: 0 },
  );
}

export function getOrderProgress(status: string) {
  return ORDER_PROGRESS[String(status || '').toUpperCase()] ?? 0;
}

export function getOrderTypeLabel(type?: string) {
  const normalized = String(type || '')
    .trim()
    .toUpperCase();
  return ORDER_TYPE_LABELS[normalized] ?? 'Modalidade não informada';
}

export function getPaymentMethodLabel(method?: string) {
  const normalized = String(method || '')
    .trim()
    .toUpperCase();
  if (!normalized) return 'Forma não informada';
  return PAYMENT_METHOD_LABELS[normalized] ?? method?.replaceAll('_', ' ') ?? normalized;
}

export function isAutomaticRefundEligible(order: AdminOrder) {
  const method = String(order.paymentMethod || '')
    .trim()
    .toUpperCase();
  const isOnlinePixOrCard = ['PIX', 'CARTAO', 'CARD', 'CREDIT_CARD', 'DEBIT_CARD'].includes(method);
  return Boolean(order.paid && !order.payOnDelivery && isOnlinePixOrCard);
}

export function getOrderPaymentPresentation(order: AdminOrder): {
  title: string;
  detail: string;
  tone: OrderPaymentTone;
  automaticRefund: boolean;
} {
  const method = getPaymentMethodLabel(order.payOnDeliveryMethod || order.paymentMethod);
  const automaticRefund = isAutomaticRefundEligible(order);

  if (order.refundStatus === 'SUCCEEDED') {
    return {
      title: 'Estorno concluído',
      detail: `${method} · valor devolvido`,
      tone: 'neutral',
      automaticRefund,
    };
  }

  if (order.refundStatus === 'PROCESSING') {
    return {
      title: 'Estorno em processamento',
      detail: `${method} · aguarde a confirmação`,
      tone: 'warning',
      automaticRefund,
    };
  }

  if (order.refundStatus === 'FAILED') {
    return {
      title: 'Estorno requer atenção',
      detail: `${method} · tente novamente`,
      tone: 'warning',
      automaticRefund,
    };
  }

  if (automaticRefund) {
    return {
      title: 'Pago online',
      detail: `${method} · estorno automático ao cancelar`,
      tone: 'success',
      automaticRefund,
    };
  }

  if (order.paid && order.payOnDelivery) {
    return {
      title: 'Pago na entrega',
      detail: `${method} · sem transação online`,
      tone: 'success',
      automaticRefund,
    };
  }

  if (order.paid) {
    return {
      title: 'Pagamento confirmado',
      detail: `${method} · sem estorno online automático`,
      tone: 'neutral',
      automaticRefund,
    };
  }

  if (order.payOnDelivery) {
    return {
      title: 'Receber na entrega',
      detail: `${method} · confirme após receber`,
      tone: 'warning',
      automaticRefund,
    };
  }

  return {
    title: 'Pagamento pendente',
    detail: method,
    tone: 'warning',
    automaticRefund,
  };
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
