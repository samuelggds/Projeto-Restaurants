// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../../config/prisma.js';
import job from './OrderPixPaymentExpirationJob.js';
import statusService from '../services/GetOrderCardPaymentStatusService.js';
import attemptRepository from '../repositories/OrderPaymentAttemptRepository.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';

test('worker preserva tentativa e pedido quando a busca do provedor é vazia ou falha', async (t) => {
  const originalFirst = prisma.order.findFirst;
  prisma.order.findFirst = async () => ({ id: 91 });
  const originalFind = prisma.order.findMany;
  t.after(() => {
    prisma.order.findFirst = originalFirst;
    prisma.order.findMany = originalFind;
  });
  prisma.order.findMany = async ({ where }) => {
    assert.ok(where.status.in.includes('CANCELADO'));
    return [
      {
        id: 91,
        publicId: 'fixture',
        userId: 17,
        restaurantId: 7,
        paymentMethod: 'CARTAO',
        tableSessionId: 8,
        participantId: 9,
      },
    ];
  };
  t.mock.method(statusService, 'execute', async (input) => {
    assert.equal(input.tableSessionId, 8);
    assert.equal(input.participantId, 9);
    return { paid: false, status: 'PENDING', reconciliationPending: true };
  });
  const expire = t.mock.method(attemptRepository, 'update', async () => {
    throw new Error('Não expirar tentativa incerta.');
  });
  const cancel = t.mock.method(failPendingOrderPaymentService, 'execute', async () => {
    throw new Error('Não cancelar cobrança incerta.');
  });
  assert.deepEqual(await job.execute(), { checkedCount: 1, expiredCount: 0, confirmedCount: 0 });
  assert.equal(expire.mock.callCount(), 0);
  assert.equal(cancel.mock.callCount(), 0);
});

test('um lote inteiro de pagamentos incertos não bloqueia os próximos pedidos no sweep', async (t) => {
  const originalFirst = prisma.order.findFirst;
  const originalMany = prisma.order.findMany;
  t.after(() => {
    prisma.order.findFirst = originalFirst;
    prisma.order.findMany = originalMany;
  });
  const candidates = Array.from({ length: 202 }, (_, index) => ({
    id: index + 1,
    publicId: `order-${index + 1}`,
    userId: 17,
    restaurantId: 7,
    paymentMethod: 'CARTAO',
    tableSessionId: null,
    participantId: null,
  }));
  prisma.order.findFirst = async ({ orderBy }) => {
    assert.deepEqual(orderBy, { id: 'desc' });
    return { id: 201 };
  };
  let pages = 0;
  prisma.order.findMany = async ({ where, orderBy, take }) => {
    assert.equal(++pages <= 2, true, 'Não repetir um lote de pedidos ainda pendentes.');
    assert.deepEqual(orderBy, { id: 'asc' });
    assert.deepEqual(where.id, { gt: pages === 1 ? 0 : 200, lte: 201 });
    assert.equal(take, 200);
    // Order 202 arrived after the sweep began and belongs to the next run.
    return candidates.filter(({ id }) => id > where.id.gt && id <= where.id.lte).slice(0, take);
  };
  const seen = new Set();
  t.mock.method(statusService, 'execute', async ({ orderPublicId }) => {
    assert.equal(seen.has(orderPublicId), false, 'Não reconciliar o mesmo pedido duas vezes.');
    seen.add(orderPublicId);
    return orderPublicId === 'order-201'
      ? { paid: true, status: 'PAID' }
      : { paid: false, status: 'PENDING', reconciliationPending: true };
  });
  const expire = t.mock.method(attemptRepository, 'update', async () => {
    throw new Error('Não expirar tentativa incerta.');
  });
  const cancel = t.mock.method(failPendingOrderPaymentService, 'execute', async () => {
    throw new Error('Não cancelar cobrança incerta.');
  });

  assert.deepEqual(await job.execute(), { checkedCount: 201, expiredCount: 0, confirmedCount: 1 });
  assert.equal(pages, 2);
  assert.equal(seen.size, 201);
  assert.equal(seen.has('order-202'), false);
  assert.equal(expire.mock.callCount(), 0);
  assert.equal(cancel.mock.callCount(), 0);
});
