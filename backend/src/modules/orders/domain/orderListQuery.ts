import { OrderStatus, OrderType, PaymentMethod, Prisma } from '@prisma/client';
import { OrderRequestError } from './OrderRequestError.js';

const queues = ['ALL', 'ACTIVE', 'PAYMENT', 'IN_PROGRESS', 'DELIVERED', 'HISTORY'] as const;
export type OrderListQuery = {
  limit: number;
  cursor?: number;
  status?: OrderStatus;
  search?: string;
  queue: (typeof queues)[number];
  type?: OrderType;
  payment?: PaymentMethod;
  createdFrom?: Date;
  createdTo?: Date;
  issuesOnly?: boolean;
  issueState?: 'OPEN' | 'RESOLVED';
};

export function parseOrderListQuery(query: Record<string, unknown>): OrderListQuery {
  const scalar = (key: string) => {
    const value = query[key];
    if (value !== undefined && typeof value !== 'string') {
      throw new OrderRequestError(`Parâmetro ${key} inválido.`);
    }
    return value as string | undefined;
  };
  const positive = (key: string, fallback?: number) => {
    const raw = scalar(key);
    if (raw === undefined) return fallback;
    if (!/^[1-9]\d*$/u.test(raw) || !Number.isSafeInteger(Number(raw))) {
      throw new OrderRequestError(`Parâmetro ${key} inválido.`);
    }
    return Number(raw);
  };
  const limit = positive('limit', 50)!;
  if (limit > 100) throw new OrderRequestError('Limite máximo de 100 pedidos por página.');
  const status = scalar('status')?.toUpperCase() as OrderStatus | undefined;
  if (status && !Object.values(OrderStatus).includes(status)) {
    throw new OrderRequestError('Status de pedido inválido.');
  }
  const queue = (scalar('queue')?.toUpperCase() || 'ALL') as OrderListQuery['queue'];
  if (!queues.includes(queue)) throw new OrderRequestError('Fila de pedidos inválida.');
  const type = scalar('type')?.toUpperCase() as OrderType | undefined;
  if (type && !Object.values(OrderType).includes(type)) {
    throw new OrderRequestError('Modalidade de pedido inválida.');
  }
  const payment = scalar('payment')?.toUpperCase() as PaymentMethod | undefined;
  if (payment && !Object.values(PaymentMethod).includes(payment)) {
    throw new OrderRequestError('Meio de pagamento inválido.');
  }
  const parseDate = (key: string) => {
    const value = scalar(key);
    if (value === undefined) return undefined;
    const date = new Date(value);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
      Number.isNaN(date.getTime()) || date.toISOString() !== value) {
      throw new OrderRequestError('Período inválido.');
    }
    return date;
  };
  const createdFrom = parseDate('createdFrom');
  const createdTo = parseDate('createdTo');
  if (Boolean(createdFrom) !== Boolean(createdTo) ||
    (createdFrom && createdTo && createdTo <= createdFrom)) {
    throw new OrderRequestError('Período inválido.');
  }
  const search = scalar('search')?.trim();
  if (search && search.length > 100) throw new OrderRequestError('Busca limitada a 100 caracteres.');
  const issues = scalar('issuesOnly');
  if (issues && issues !== 'true' && issues !== 'false') {
    throw new OrderRequestError('Filtro de atendimento inválido.');
  }
  const issueState = scalar('issueState');
  if (issueState && !['OPEN', 'RESOLVED'].includes(issueState)) {
    throw new OrderRequestError('Situação do atendimento inválida.');
  }
  return {
    limit,
    cursor: positive('cursor'),
    status,
    queue,
    search,
    ...(type ? { type } : {}),
    ...(payment ? { payment } : {}),
    ...(createdFrom && createdTo ? { createdFrom, createdTo } : {}),
    issuesOnly: issues === 'true',
    issueState: issueState as OrderListQuery['issueState'],
  };
}

export function queueWhere(queue: OrderListQuery['queue']): Prisma.OrderWhereInput {
  switch (queue) {
    case 'ACTIVE': return { status: { notIn: ['ENTREGUE', 'CANCELADO'] } };
    case 'PAYMENT': return { paid: false, status: { not: 'CANCELADO' } };
    case 'IN_PROGRESS': return { status: { in: ['PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA'] } };
    case 'DELIVERED': return { status: 'ENTREGUE' };
    case 'HISTORY': return { status: { in: ['ENTREGUE', 'CANCELADO'] } };
    default: return {};
  }
}

export const operationalPaymentWhere = {
  OR: [
    { settlementMode: 'TABLE_ACCOUNT' }, { paymentMethod: null }, { paid: true },
    { payOnDelivery: true }, { paymentMethod: { notIn: ['PIX', 'CARTAO'] } },
  ],
} satisfies Prisma.OrderWhereInput;

export function filteredOrderWhere(base: Prisma.OrderWhereInput, query: OrderListQuery) {
  const search = query.search?.replace(/^#/u, '');
  return {
    AND: [base, queueWhere(query.queue),
      ...(query.status ? [{ status: query.status }] : []),
      ...(query.type ? [{ type: query.type }] : []),
      ...(query.payment ? [{
        OR: [
          { paymentMethod: query.payment },
          { payOnDeliveryMethod: query.payment },
        ],
      }] : []),
      ...(query.createdFrom && query.createdTo
        ? [{ createdAt: { gte: query.createdFrom, lt: query.createdTo } }]
        : []),
      ...(query.issuesOnly ? [{ issueThread: { isNot: null } }] : []),
      ...(query.issueState ? [{ issueThread: { is: { isResolved: query.issueState === 'RESOLVED' } } }] : []),
      ...(search ? [{ OR: [
        ...(/^[1-9]\d*$/u.test(search) && Number.isSafeInteger(Number(search)) ? [{ id: Number(search) }] : []),
        { user: { is: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
        { participant: { is: { displayName: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
      ] }] : []),
    ],
  } satisfies Prisma.OrderWhereInput;
}
