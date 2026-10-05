import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';
import MercadoPagoOrderWebhookController, {
  parseMercadoPagoOrderReference,
} from './MercadoPagoOrderWebhookController.js';

type MockResponse = {
  statusCode: number;
  payload: unknown;
  status: (code: number) => MockResponse;
  json: (body: unknown) => MockResponse;
  sendStatus: (code: number) => MockResponse;
};

const originalEnv = {
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET,
  ALLOW_GLOBAL_PAYMENT_FALLBACK: process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK,
};

function restoreEnv(name: keyof typeof originalEnv) {
  const value = originalEnv[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.payload = body;
      return this;
    },
    sendStatus(code: number) {
      this.statusCode = code;
      return this;
    },
  };
}

afterEach(() => {
  restoreEnv('MP_WEBHOOK_SECRET');
  restoreEnv('ALLOW_GLOBAL_PAYMENT_FALLBACK');
});

test('deve exigir restaurantId no webhook Mercado Pago quando fallback global estiver desativado', async () => {
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = 'false';
  process.env.MP_WEBHOOK_SECRET = 'test-webhook-secret';

  const req = {
    body: {
      data: {
        id: 'mp-payment-1',
      },
    },
    query: { 'data.id': 'mp-payment-1' },
    headers: {
      'x-request-id': 'request-1',
      'x-signature': `ts=1742505638,v1=${createHmac('sha256', 'test-webhook-secret').update('id:mp-payment-1;request-id:request-1;ts:1742505638;').digest('hex')}`,
    },
  } as any;
  const res = createMockResponse();

  await MercadoPagoOrderWebhookController.handle(req, res as any);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.payload, {
    error: 'restaurantId obrigatorio no webhook Mercado Pago para ambiente multi-tenant.',
  });
});

test('interpreta referencias novas e legadas do Mercado Pago sem quebrar Pix', () => {
  for (const reference of ['ordercard_321_7', 'ordercard:321:7', 'ordercard-321-7']) {
    assert.deepEqual(parseMercadoPagoOrderReference(reference), {
      type: 'card',
      orderId: 321,
      restaurantId: 7,
    });
  }
  assert.deepEqual(parseMercadoPagoOrderReference('orderpix:7:321'), {
    type: 'pix',
    orderId: 321,
    restaurantId: 7,
  });
});

test('webhook preserva motivo da transação e registra referência sem corpo bruto', async (t) => {
  process.env.MP_WEBHOOK_SECRET = 'test-webhook-secret';
  const events: Record<string, unknown>[] = [];
  t.mock.method(console, 'info', (_tag, value) => { events.push(value); });
  const orderDelegate = prisma.order as unknown as {
    findFirst: (args: unknown) => Promise<unknown>;
  };
  const originalFindOrder = orderDelegate.findFirst;
  orderDelegate.findFirst = async () => ({ id: 321, restaurantId: 7 });
  t.after(() => {
    orderDelegate.findFirst = originalFindOrder;
  });
  t.mock.method(restaurantSettingsRepository, 'findByRestaurantId', async () => ({
    mercadoPagoAccessToken: 'test-access', mercadoPagoRefreshToken: 'test-refresh',
    mercadoPagoTokenExpiresAt: new Date(Date.now() + 3600000),
  }) as never);
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    id: 'ORD-ASYNC', status: 'failed', status_detail: 'failed', external_reference: 'ordercard_321_7',
    transactions: { payments: [{ id: 'PAY-ASYNC', status: 'failed', status_detail: 'high_risk', token: 'private-token' }] },
  }));
  let attempt: Record<string, unknown> = { id: 2, publicId: '123e4567-e89b-42d3-a456-426614174002',
    providerOrderId: 'ORD-ASYNC', providerStatus: 'processing', providerStatusDetail: null };
  t.mock.method(orderPaymentAttemptRepository, 'latestForOrder', async () => attempt as never);
  t.mock.method(orderPaymentAttemptRepository, 'update', async (_id, _tenant, status, diagnostic) => {
    attempt = { ...attempt, ...diagnostic, status };
    return attempt as never;
  });
  const signature = createHmac('sha256', 'test-webhook-secret')
    .update('id:ord-async;request-id:request-1;ts:1742505638;').digest('hex');
  const req = { body: { type: 'order', data: { id: 'ORD-ASYNC' } },
    query: { 'data.id': 'ORD-ASYNC' },
    headers: { 'x-request-id': 'request-1', 'x-signature': `ts=1742505638,v1=${signature}` },
  } as any;
  const res = createMockResponse();
  await MercadoPagoOrderWebhookController.handle(req, res as any);
  await MercadoPagoOrderWebhookController.handle(req, res as any);
  assert.equal(res.statusCode, 200);
  assert.equal(attempt.providerStatusDetail, 'high_risk');
  assert.equal(attempt.providerPaymentId, 'PAY-ASYNC');
  assert.equal(events.length, 1);
  assert.equal(events[0].stage, 'webhook');
  assert.equal(events[0].paymentAttemptId, attempt.publicId);
  assert.doesNotMatch(JSON.stringify(events), /private-token|test-access/);
});
