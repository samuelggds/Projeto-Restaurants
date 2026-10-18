// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../../config/prisma.js';
import job from './OrderPendingPixPaymentReconciliationJob.js';
import pix from '../services/OrderPixPaymentService.js';
import finalizePix from '../services/FinalizeOrderPixPaymentService.js';

test('worker consulta somente Pix ativos e aprova somente pelo finalizador seguro', async (t) => {
  const originalFind = prisma.order.findMany;
  t.after(() => { prisma.order.findMany = originalFind; });
  const now = new Date('2026-10-18T12:00:00Z');
  prisma.order.findMany = async ({ where, take, orderBy }) => {
    assert.equal(where.status, 'PENDENTE');
    assert.equal(where.paid, false);
    assert.equal(where.payOnDelivery, false);
    assert.equal(where.paymentMethod, 'PIX');
    assert.deepEqual(where.pixPaymentId, { not: null });
    assert.deepEqual(where.pixExpiresAt, { gt: now });
    assert.equal(take, 40);
    assert.deepEqual(orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
    return [
      { id: 91, restaurantId: 7, pixPaymentId: 'pay-91' },
      { id: 92, restaurantId: 8, pixPaymentId: 'pay-92' },
    ];
  };
  const calls = [];
  t.mock.method(pix, 'getPaymentStatus', async ({ paymentId, restaurantId }) => {
    calls.push([paymentId, restaurantId]);
    return { isApproved: paymentId === 'pay-91', sameRestaurant: true };
  });
  const finalized = t.mock.method(finalizePix, 'execute', async (input) => {
    assert.deepEqual(input, { orderId: 91, restaurantId: 7, paymentId: 'pay-91' });
    return { paid: true };
  });
  const create = t.mock.method(pix, 'createPixPayment', async () => {
    throw new Error('Não iniciar nova cobrança');
  });
  assert.deepEqual(await job.execute(now), { checkedCount: 2, confirmedCount: 1 });
  assert.deepEqual(calls, [['pay-91', 7], ['pay-92', 8]]);
  assert.equal(finalized.mock.callCount(), 1);
  assert.equal(create.mock.callCount(), 0);
});

test('worker preserva pedidos diante de tenant incorreto e erro isolado do gateway', async (t) => {
  const originalFind = prisma.order.findMany;
  t.after(() => { prisma.order.findMany = originalFind; });
  prisma.order.findMany = async () => [
    { id: 91, restaurantId: 7, pixPaymentId: 'wrong-tenant' },
    { id: 92, restaurantId: 8, pixPaymentId: 'offline' },
    { id: 93, restaurantId: 9, pixPaymentId: 'approved' },
  ];
  t.mock.method(pix, 'getPaymentStatus', async ({ paymentId }) => {
    if (paymentId === 'wrong-tenant') return { isApproved: true, sameRestaurant: false };
    if (paymentId === 'offline') throw new Error('Provedor indisponível');
    return { isApproved: true, sameRestaurant: true };
  });
  const finalizations = [];
  t.mock.method(finalizePix, 'execute', async (input) => {
    finalizations.push(input);
    return { paid: true };
  });
  const originalError = console.error;
  console.error = () => undefined;
  try {
    await assert.rejects(() => job.execute(), AggregateError);
    assert.deepEqual(finalizations, [{ orderId: 93, restaurantId: 9, paymentId: 'approved' }]);
  } finally {
    console.error = originalError;
  }
});
