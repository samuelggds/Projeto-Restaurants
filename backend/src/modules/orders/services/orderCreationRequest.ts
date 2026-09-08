import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { OrderRequestError } from '../domain/OrderRequestError.js';
import orderRepository from '../repositories/OrderRepository.js';

export type OrderCreationContext = { key: string; actor: string; fingerprint: string };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

export function orderCreationContext(req: Request): OrderCreationContext | undefined {
  const key = req.headers['idempotency-key'];
  if (key === undefined) return undefined; // Compatibilidade com clientes anteriores; cliente atual sempre envia.
  if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/u.test(key)) {
    throw new OrderRequestError('Idempotency-Key inválida.');
  }
  let actor: string;
  if (req.tableParticipant?.id) actor = `participant:${req.tableParticipant.id}`;
  else if (req.user?.id) actor = `user:${req.user.id}`;
  else {
    const session = req.headers['x-order-session'];
    if (typeof session !== 'string' || !/^[a-zA-Z0-9_-]{32,128}$/u.test(session)) {
      throw new OrderRequestError('Sessão de criação do pedido não informada.');
    }
    actor = `guest:${session}`;
  }
  return { key: hash(key), actor: hash(actor), fingerprint: hash(JSON.stringify(canonical(req.body))) };
}

export async function replayCreatedOrder(db: Prisma.TransactionClient, restaurantId: number, context?: OrderCreationContext) {
  if (!context) return null;
  const existing = await db.order.findFirst({
    where: { restaurantId, creationRequestKey: context.key, creationActor: context.actor },
    select: { id: true, creationFingerprint: true },
  });
  if (!existing) return null;
  if (existing.creationFingerprint !== context.fingerprint) {
    throw new OrderRequestError('Esta tentativa já foi usada com outro pedido. Atualize o carrinho e tente novamente.', 409, 'IDEMPOTENCY_CONFLICT');
  }
  return orderRepository.findById(existing.id, restaurantId, db);
}

export async function retryOrderTransaction<T>(operation: () => Promise<T>, pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))) {
  for (let attempt = 0; ; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      const candidate = error as { code?: string; meta?: { target?: unknown } };
      const requestCollision = candidate?.code === 'P2002' && JSON.stringify(candidate.meta?.target || '').includes('creationRequestKey');
      if (candidate?.code !== 'P2034' && !requestCollision) throw error;
      if (attempt >= 3) throw new OrderRequestError('O pedido encontrou uma atualização simultânea. Tente novamente.', 409, 'ORDER_TRANSACTION_CONFLICT');
      await pause(25 * 2 ** attempt + Math.floor(Math.random() * 25));
    }
  }
}
