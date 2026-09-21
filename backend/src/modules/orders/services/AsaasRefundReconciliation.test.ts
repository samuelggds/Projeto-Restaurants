// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import orderRepository from '../repositories/OrderRepository.js';
import cancelOrderWorkflowService from './CancelOrderWorkflowService.js';
import reconcileLateCancelledPaymentService from './ReconcileLateCancelledPaymentService.js';
import webhook from '../controllers/AsaasOrderWebhookController.js';

const originals = {
  fetch: globalThis.fetch,
  findById: orderRepository.findById,
  findFirst: prisma.order.findFirst,
  updateMany: prisma.order.updateMany,
  transaction: prisma.$transaction,
  findSettings: restaurantSettingsRepository.findByRestaurantId,
  webhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
};

afterEach(() => {
  globalThis.fetch = originals.fetch;
  orderRepository.findById = originals.findById;
  prisma.order.findFirst = originals.findFirst;
  prisma.order.updateMany = originals.updateMany;
  prisma.$transaction = originals.transaction;
  restaurantSettingsRepository.findByRestaurantId = originals.findSettings;
  if (originals.webhookToken === undefined) delete process.env.ASAAS_WEBHOOK_TOKEN;
  else process.env.ASAAS_WEBHOOK_TOKEN = originals.webhookToken;
});

function setup({ late = false, timeout = false } = {}) {
  const order = {
    id: 91,
    restaurantId: 7,
    publicId: 'test-public-91',
    userId: 12,
    status: late ? 'CANCELADO' : 'PENDENTE',
    paid: !late,
    paymentMethod: 'PIX',
    payOnDelivery: false,
    total: 59.9,
    pixPaymentId: 'asaas:pay_91',
    cardCheckoutSessionId: null,
    refundStatus: 'NOT_REQUESTED',
    refundIdempotencyKey: null,
    refundedAt: null,
    tableSessionId: null,
    items: [{ productId: 5, quantity: 1 }],
  };
  const remote = { status: 'RECEIVED', refunds: [] };
  const counts = { posts: 0, gets: 0, stockRestores: 0 };
  const find = async (id, restaurantId) =>
    id === order.id && restaurantId === order.restaurantId ? { ...order } : null;
  const updateMany = async ({ where, data }) => {
    if (where.id !== order.id || where.restaurantId !== order.restaurantId) return { count: 0 };
    for (const field of ['paid', 'refundStatus', 'refundIdempotencyKey', 'pixPaymentId']) {
      if (Object.hasOwn(where, field) && where[field] !== order[field]) return { count: 0 };
    }
    if (typeof where.status === 'string' && where.status !== order.status) return { count: 0 };
    if (where.status?.notIn?.includes(order.status)) return { count: 0 };
    Object.assign(order, data);
    return { count: 1 };
  };
  orderRepository.findById = find;
  prisma.order.findFirst = async ({ where }) => find(where.id, where.restaurantId);
  prisma.order.updateMany = updateMany;
  prisma.$transaction = async (callback) =>
    callback({
      order: { updateMany, findFirst: async () => ({ couponRedemptionId: null }) },
      product: {
        updateMany: async () => {
          counts.stockRestores++;
          return { count: 1 };
        },
      },
    });
  restaurantSettingsRepository.findByRestaurantId = async (id) => {
    assert.equal(id, 7);
    return { asaasAccessToken: 'synthetic-tenant-token' };
  };
  globalThis.fetch = async (input, init = {}) => {
    assert.match(String(input), /\/v3\/payments\/pay_91(?:\/refund)?$/);
    assert.equal(new Headers(init.headers).get('access_token'), 'synthetic-tenant-token');
    if (init.method === 'POST') {
      counts.posts++;
      remote.refunds = [{ status: 'PENDING', value: 59.9 }];
      if (timeout) throw new Error('connection closed after submission');
      // Even an optimistic POST body cannot confirm money returned.
      return Response.json({ status: 'REFUNDED', refunds: [{ status: 'DONE', value: 59.9 }] });
    }
    counts.gets++;
    return Response.json({
      id: 'pay_91',
      externalReference: 'orderpix:7:91',
      value: 59.9,
      ...remote,
    });
  };
  process.env.ASAAS_WEBHOOK_TOKEN = 'synthetic-webhook-token';
  return { order, remote, counts };
}

async function notifyRefund(paymentId = 'pay_91', token = 'synthetic-webhook-token') {
  const req = {
    header: () => token,
    body: {
      event: 'PAYMENT_REFUNDED',
      payment: { id: paymentId, externalReference: 'orderpix:7:91', value: 59.9 },
    },
  };
  const res = {
    statusCode: 0,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  await webhook.handle(req, res);
  return res;
}

for (const timeout of [false, true]) {
  test(`Asaas ${timeout ? 'timeout após envio' : 'HTTP 200'} mantém estorno pendente até webhook e consulta confirmarem`, async () => {
    const { order, remote, counts } = setup({ timeout });
    await assert.rejects(() => cancelOrderWorkflowService.execute({ ...order }), {
      code: 'REFUND_PENDING',
    });
    assert.equal(order.refundStatus, 'PROCESSING');
    assert.equal(order.status, 'PENDENTE');
    assert.equal(order.refundedAt, null);
    const pending = await notifyRefund();
    assert.deepEqual(pending.payload, { received: true, pending: true });
    assert.equal(order.refundStatus, 'PROCESSING');
    assert.equal(counts.posts, 1);
    remote.status = 'REFUNDED';
    remote.refunds = [
      { status: 'DONE', value: 20 },
      { status: 'DONE', value: 39.9 },
    ];
    const completed = await notifyRefund();
    assert.equal(completed.statusCode, 200);
    assert.equal(order.refundStatus, 'SUCCEEDED');
    assert.equal(order.status, 'CANCELADO');
    assert.ok(order.refundedAt instanceof Date);
    await cancelOrderWorkflowService.execute({ ...order });
    assert.equal(counts.posts, 1);
    assert.equal(counts.stockRestores, 1);
  });
}

test('estorno tardio usa somente a referência reclamada e webhook não repete devolução', async () => {
  const { order, remote, counts } = setup({ late: true });
  const input = {
    orderId: 91,
    restaurantId: 7,
    paymentMethod: 'PIX',
    paymentReference: 'asaas:pay_91',
  };
  await assert.rejects(() => reconcileLateCancelledPaymentService.execute(input), {
    code: 'REFUND_PENDING',
  });
  assert.equal(order.pixPaymentId, 'late_refund_pending:asaas:pay_91');
  assert.equal(order.refundStatus, 'PROCESSING');
  const getsBefore = counts.gets;
  await assert.rejects(() =>
    reconcileLateCancelledPaymentService.execute({ ...input, paymentReference: 'asaas:pay_other' }),
  );
  assert.equal(counts.gets, getsBefore);
  const forged = await notifyRefund('pay_other');
  assert.deepEqual(forged.payload, { received: true, ignored: true });
  assert.equal(counts.gets, getsBefore);
  remote.status = 'REFUNDED';
  remote.refunds = [{ status: 'DONE', value: 59.9 }];
  const response = await notifyRefund();
  assert.equal(response.statusCode, 200);
  assert.equal(order.refundStatus, 'SUCCEEDED');
  assert.equal(order.pixPaymentId, 'late_refunded:asaas:pay_91');
  assert.equal(order.status, 'CANCELADO');
  await notifyRefund();
  assert.equal(counts.posts, 1);
});

test('webhook sem autenticação não consulta nem altera estorno pendente', async () => {
  const { order, counts } = setup();
  order.refundStatus = 'PROCESSING';
  const response = await notifyRefund('pay_91', 'wrong-token');
  assert.equal(response.statusCode, 401);
  assert.equal(counts.gets, 0);
  assert.equal(counts.posts, 0);
  assert.equal(order.refundStatus, 'PROCESSING');
});
