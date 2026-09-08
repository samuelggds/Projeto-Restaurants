import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { orderCreationContext, replayCreatedOrder, retryOrderTransaction } from './orderCreationRequest.js';
import orderRepository from '../repositories/OrderRepository.js';

const req = (body: unknown, userId = 7) => ({ headers: { 'idempotency-key': 'attempt-key-123456789' }, user: { id: userId }, body }) as unknown as Request;
test('fingerprint é estável e o escopo usa a identidade autenticada', () => {
  const first = orderCreationContext(req({ restaurantId: 1, items: [1, 2] }))!;
  assert.deepEqual(first, orderCreationContext(req({ items: [1, 2], restaurantId: 1 })));
  assert.notEqual(first.actor, orderCreationContext(req({}, 8))?.actor);
  assert.notEqual(first.fingerprint, orderCreationContext(req({ restaurantId: 2, items: [1, 2] }))?.fingerprint);
  assert.throws(() => orderCreationContext({ headers: { 'idempotency-key': 'attempt-key-123456789' }, body: {} } as unknown as Request), /Sessão/);
});
test('retry repete somente conflito de serialização/índice da tentativa e tem limite', async () => {
  let calls = 0;
  assert.equal(await retryOrderTransaction(async () => { calls++; if (calls < 3) throw { code: 'P2034' }; return 42; }, async () => {}), 42);
  assert.equal(calls, 3);
  calls = 0;
  await assert.rejects(retryOrderTransaction(async () => { calls++; throw { code: 'P2034' }; }, async () => {}), { statusCode: 409 });
  assert.equal(calls, 4);
  const unrelated = { code: 'P2002', meta: { target: ['pixPaymentId'] } };
  await assert.rejects(retryOrderTransaction(async () => { throw unrelated; }), (error) => error === unrelated);
});
test('replay consulta restaurante/ator/chave, devolve o pedido e recusa conteúdo conflitante', async () => {
  const context = orderCreationContext(req({ items: [1] }))!;
  const original = orderRepository.findById;
  let fingerprint = context.fingerprint;
  const db = { order: { findFirst: async ({ where }: { where: unknown }) => {
    assert.deepEqual(where, { restaurantId: 3, creationRequestKey: context.key, creationActor: context.actor });
    return { id: 99, creationFingerprint: fingerprint };
  } } } as unknown as Prisma.TransactionClient;
  orderRepository.findById = async (id, tenant, tx) => {
    assert.equal(id, 99); assert.equal(tenant, 3); assert.equal(tx, db);
    return { id: 99 } as Awaited<ReturnType<typeof original>>;
  };
  try {
    assert.equal((await replayCreatedOrder(db, 3, context))?.id, 99);
    fingerprint = 'another-request';
    await assert.rejects(replayCreatedOrder(db, 3, context), { statusCode: 409, code: 'IDEMPOTENCY_CONFLICT' });
  } finally { orderRepository.findById = original; }
});
