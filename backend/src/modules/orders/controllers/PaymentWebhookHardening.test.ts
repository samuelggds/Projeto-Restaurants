import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
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
