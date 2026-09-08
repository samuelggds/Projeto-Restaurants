import { OrderStatus, Prisma } from '@prisma/client';
import { OrderRequestError } from './OrderRequestError.js';

const queues = ['ALL', 'ACTIVE', 'PAYMENT', 'IN_PROGRESS', 'DELIVERED'] as const;
export type OrderListQuery = {
  limit: number;
  cursor?: number;
  status?: OrderStatus;
  search?: string;
  queue: (typeof queues)[number];
  issuesOnly?: boolean;
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
  const search = scalar('search')?.trim();
  if (search && search.length > 100) throw new OrderRequestError('Busca limitada a 100 caracteres.');
  const issues = scalar('issuesOnly');
  if (issues && issues !== 'true' && issues !== 'false') {
    throw new OrderRequestError('Filtro de atendimento inválido.');
  }
  return { limit, cursor: positive('cursor'), status, queue, search, issuesOnly: issues === 'true' };
}

export function queueWhere(queue: OrderListQuery['queue']): Prisma.OrderWhereInput {
  switch (queue) {
    case 'ACTIVE': return { status: { notIn: ['ENTREGUE', 'CANCELADO'] } };
    case 'PAYMENT': return { paid: false, status: { not: 'CANCELADO' } };
    case 'IN_PROGRESS': return { status: { in: ['PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA'] } };
    case 'DELIVERED': return { status: 'ENTREGUE' };
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
      ...(query.issuesOnly ? [{ issueThread: { isNot: null } }] : []),
      ...(search ? [{ OR: [
        ...(/^[1-9]\d*$/u.test(search) && Number.isSafeInteger(Number(search)) ? [{ id: Number(search) }] : []),
        { user: { is: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
        { participant: { is: { displayName: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
      ] }] : []),
    ],
  } satisfies Prisma.OrderWhereInput;
}
