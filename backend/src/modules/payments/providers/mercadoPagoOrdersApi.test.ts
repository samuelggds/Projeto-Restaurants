import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMercadoPagoOrderApi,
  getMercadoPagoPreferenceApi,
  mercadoPagoCheckoutIdempotencyKey,
} from './mercadoPagoClient.js';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = 'true';
  process.env.MP_ACCESS_TOKEN = 'test-access-token';
  process.env.MP_API_BASE_URL = 'https://api.mercadopago.com';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of Object.keys(process.env)) if (!(name in originalEnv)) delete process.env[name];
  Object.assign(process.env, originalEnv);
});

test('adapta Checkout Pro legado para POST /v1/orders com idempotência e checkout_url', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({
        id: 'ORD01ABC',
        status: 'created',
        checkout_url: 'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORD01ABC',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const api = await getMercadoPagoPreferenceApi();
  const result = await api.create({
    body: {
      external_reference: 'ordercard_41_7',
      payer: { email: 'cliente@example.com' },
      items: [
        {
          id: '41',
          title: 'Pedido #41',
          description: 'Restaurante teste',
          quantity: 1,
          unit_price: 50,
        },
      ],
      back_urls: {
        success: 'https://www.gastronexa.com.br/sucesso',
        failure: 'https://www.gastronexa.com.br/falha',
        pending: 'https://www.gastronexa.com.br/pendente',
      },
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.mercadopago.com/v1/orders');
  assert.equal(calls[0].init?.method, 'POST');
  const headers = calls[0].init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer test-access-token');
  assert.equal(headers['X-Idempotency-Key'], 'ordercard_41_7-base');
  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.type, 'online');
  assert.equal(body.processing_mode, 'manual');
  assert.equal(body.capture_mode, 'automatic_async');
  assert.equal(body.total_amount, '50.00');
  assert.equal(Object.hasOwn(body, 'marketplace_fee'), false);
  assert.equal(body.external_reference, 'ordercard_41_7');
  assert.equal(body.items[0].unit_price, '50.00');
  assert.equal(body.config.online.auto_return, 'approved');
  assert.deepEqual(result, {
    id: 'ORD01ABC',
    init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORD01ABC',
  });
});

test('gera idempotência UUID estável para Checkout Pro', () => {
  const first = mercadoPagoCheckoutIdempotencyKey('open-finance:7:91');
  const second = mercadoPagoCheckoutIdempotencyKey('open-finance:7:91');
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('cancela uma order com chave idempotente', async () => {
  let requested = '';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requested = String(input);
    requestInit = init;
    return Response.json({ id: 'ORD_OPEN_123', status: 'cancelled' });
  };

  const api = await getMercadoPagoOrderApi();
  const result = await api.cancel(
    'ORD_OPEN_123',
    '5d90783e-4f75-5b45-ab4a-06829cc70dc2',
  );

  assert.equal(requested, 'https://api.mercadopago.com/v1/orders/ORD_OPEN_123/cancel');
  assert.equal(requestInit?.method, 'POST');
  assert.equal(
    new Headers(requestInit?.headers).get('x-idempotency-key'),
    '5d90783e-4f75-5b45-ab4a-06829cc70dc2',
  );
  assert.equal(result.status, 'cancelled');
});

test('consulta uma order pelo endpoint oficial', async () => {
  let requested = '';
  globalThis.fetch = async (input) => {
    requested = String(input);
    return new Response(
      JSON.stringify({
        id: 'ORD01XYZ',
        status: 'processed',
        external_reference: 'ordercard_41_7',
        total_amount: '50.00',
        total_paid_amount: '50.00',
        currency: 'BRL',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const api = await getMercadoPagoOrderApi();
  const order = await api.get('ORD01XYZ');
  assert.equal(requested, 'https://api.mercadopago.com/v1/orders/ORD01XYZ');
  assert.equal(order.status, 'processed');
  assert.equal(order.external_reference, 'ordercard_41_7');
});
