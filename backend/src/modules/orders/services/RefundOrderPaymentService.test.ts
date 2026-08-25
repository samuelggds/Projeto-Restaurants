// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import refundOrderPaymentService from './RefundOrderPaymentService.js';

const originalFindByRestaurantId = restaurantSettingsRepository.findByRestaurantId;
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const originalCreateStripeClient = refundOrderPaymentService.createStripeClient;
const originalEnv = {
  ALLOW_GLOBAL_PAYMENT_FALLBACK: process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK,
  ASAAS_API_BASE_URL: process.env.ASAAS_API_BASE_URL,
  ASAAS_API_KEY: process.env.ASAAS_API_KEY,
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
  PAGBANK_API_BASE_URL: process.env.PAGBANK_API_BASE_URL,
  PAGBANK_TOKEN: process.env.PAGBANK_TOKEN,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
};

function restoreEnv(name: keyof typeof originalEnv) {
  const value = originalEnv[name];
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId = originalFindByRestaurantId;
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
  refundOrderPaymentService.createStripeClient = originalCreateStripeClient;
  restoreEnv('ALLOW_GLOBAL_PAYMENT_FALLBACK');
  restoreEnv('ASAAS_API_BASE_URL');
  restoreEnv('ASAAS_API_KEY');
  restoreEnv('MP_ACCESS_TOKEN');
  restoreEnv('PAGBANK_API_BASE_URL');
  restoreEnv('PAGBANK_TOKEN');
  restoreEnv('STRIPE_SECRET_KEY');
});

test('roteia PIX Asaas para o endpoint oficial usando a credencial do restaurante', async () => {
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = 'true';
  process.env.ASAAS_API_KEY = 'token-global-que-nao-deve-ser-usado';
  process.env.ASAAS_API_BASE_URL = 'https://sandbox.asaas.test/';
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return { asaasAccessToken: 'token-tenant-7' };
  };

  let request = null;
  globalThis.fetch = async (input, init = {}) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify({ id: 'pay_pix_123', status: 'REFUNDED' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await refundOrderPaymentService.execute({
    id: 91,
    restaurantId: 7,
    total: 49.9,
    paid: true,
    paymentMethod: 'PIX',
    pixPaymentId: 'asaas:pay_pix_123',
  });

  assert.equal(request.url, 'https://sandbox.asaas.test/v3/payments/pay_pix_123/refund');
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers.access_token, 'token-tenant-7');
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    value: 49.9,
    description: 'Estorno do pedido #91',
  });
});

test('roteia cartao Asaas e usa fallback global somente quando habilitado', async () => {
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = 'true';
  process.env.ASAAS_API_KEY = 'token-global-asaas';
  restaurantSettingsRepository.findByRestaurantId = async () => ({ asaasAccessToken: null });

  let request = null;
  globalThis.fetch = async (input, init = {}) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify({ id: 'pay_card_456', status: 'REFUNDED' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await refundOrderPaymentService.execute({
    id: 92,
    restaurantId: 8,
    total: '110.50',
    paid: true,
    paymentMethod: 'CARTAO',
    cardCheckoutSessionId: 'asaas_pay:pay_card_456',
  });

  assert.equal(request.url, 'https://api.asaas.com/v3/payments/pay_card_456/refund');
  assert.equal(request.init.headers.access_token, 'token-global-asaas');
  assert.deepEqual(JSON.parse(String(request.init.body)), {
    value: 110.5,
    description: 'Estorno do pedido #92',
  });
});

test('estorna PIX PagBank localizando a charge paga com idempotencia', async () => {
  process.env.PAGBANK_API_BASE_URL = 'https://sandbox.pagbank.test';
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 9);
    return { pagbankToken: 'token-pagbank-tenant-9' };
  };

  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    requests.push({ url: String(input), init });
    if (String(input).endsWith('/orders/ORDE_123')) {
      return new Response(
        JSON.stringify({
          id: 'ORDE_123',
          charges: [{ id: 'CHAR_123', status: 'PAID', summary: { refunded: 0 } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ id: 'CHAR_123', status: 'CANCELED' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const receipt = await refundOrderPaymentService.execute(
    {
      id: 93,
      restaurantId: 9,
      total: 30,
      paid: true,
      paymentMethod: 'PIX',
      pixPaymentId: 'pagbank:ORDE_123',
    },
    { idempotencyKey: 'order-refund-9-93' },
  );

  assert.deepEqual(receipt, { provider: 'PAGBANK', externalId: 'CHAR_123' });
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url, 'https://sandbox.pagbank.test/charges/CHAR_123/cancel');
  assert.equal(requests[1].init.headers.Authorization, 'Bearer token-pagbank-tenant-9');
  assert.equal(requests[1].init.headers['x-idempotency-key'], 'order-refund-9-93');
  assert.deepEqual(JSON.parse(String(requests[1].init.body)), {
    amount: { value: 3000 },
  });
});

test('bloqueia identificador de cartao PagBank sem transacao antes do Stripe', async () => {
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('nao deveria chamar fetch');
  };

  await assert.rejects(
    () =>
      refundOrderPaymentService.execute({
        id: 94,
        restaurantId: 10,
        total: 55,
        paid: true,
        paymentMethod: 'CARTAO',
        cardCheckoutSessionId: 'pagbank:checkout-sem-transacao',
      }),
    /identificador PagBank não oferece estorno automático.*pedido não foi cancelado/i,
  );
  assert.equal(fetchCalls, 0);
});

test('retorna erro seguro quando o Asaas recusa o estorno', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    asaasAccessToken: 'token-tenant',
  });
  console.error = () => undefined;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ errors: [{ code: 'invalid_action', description: 'detalhe interno' }] }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );

  await assert.rejects(
    () =>
      refundOrderPaymentService.execute({
        id: 95,
        restaurantId: 11,
        total: 60,
        paid: true,
        paymentMethod: 'PIX',
        pixPaymentId: 'asaas:pay_refused',
      }),
    (error) => {
      assert.equal(
        error.message,
        'O Asaas não confirmou o estorno. O pedido não foi cancelado e pode ser tentado novamente.',
      );
      assert.equal(error.message.includes('detalhe interno'), false);
      assert.equal(error.message.includes('token-tenant'), false);
      return true;
    },
  );
});

test('usa PaymentRefund oficial do Mercado Pago para PIX e cartao com chave idempotente', async () => {
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => ({
    mercadoPagoAccessToken: `mp-token-${restaurantId}`,
  });

  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    requests.push({ url: String(input), init });
    const paymentId = /\/payments\/([^/]+)\/refunds/.exec(String(input))?.[1] || '';
    return new Response(JSON.stringify({ id: `refund-${paymentId}`, status: 'approved' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const pixReceipt = await refundOrderPaymentService.execute(
    {
      id: 96,
      restaurantId: 12,
      total: 42,
      paid: true,
      paymentMethod: 'PIX',
      pixPaymentId: '987654',
    },
    { idempotencyKey: 'order-refund-12-96' },
  );
  const cardReceipt = await refundOrderPaymentService.execute(
    {
      id: 97,
      restaurantId: 12,
      total: 84,
      paid: true,
      paymentMethod: 'CARTAO',
      cardCheckoutSessionId: 'mp_pay:123456',
    },
    { idempotencyKey: 'order-refund-12-97' },
  );

  assert.deepEqual(pixReceipt, {
    provider: 'MERCADO_PAGO',
    externalId: 'refund-987654',
  });
  assert.deepEqual(cardReceipt, {
    provider: 'MERCADO_PAGO',
    externalId: 'refund-123456',
  });
  assert.equal(requests.length, 2);
  assert.equal(
    new Headers(requests[0].init.headers).get('x-idempotency-key'),
    'order-refund-12-96',
  );
  assert.equal(
    new Headers(requests[1].init.headers).get('x-idempotency-key'),
    'order-refund-12-97',
  );
});

test('estorna cartao Stripe com a mesma chave idempotente do pedido', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    stripeSecretKey: 'sk_test_tenant',
  });

  const calls = { retrieve: [], refund: [] };
  refundOrderPaymentService.createStripeClient = () => ({
    checkout: {
      sessions: {
        retrieve: async (...args) => {
          calls.retrieve.push(args);
          return { payment_intent: { id: 'pi_123' } };
        },
      },
    },
    refunds: {
      create: async (...args) => {
        calls.refund.push(args);
        return { id: 're_123', status: 'succeeded' };
      },
    },
  });

  const receipt = await refundOrderPaymentService.execute(
    {
      id: 98,
      restaurantId: 13,
      total: 125,
      paid: true,
      paymentMethod: 'CARTAO',
      cardCheckoutSessionId: 'cs_test_123',
    },
    { idempotencyKey: 'order-refund-13-98' },
  );

  assert.deepEqual(receipt, { provider: 'STRIPE', externalId: 're_123' });
  assert.deepEqual(calls.retrieve[0], ['cs_test_123', { expand: ['payment_intent'] }]);
  assert.deepEqual(calls.refund[0], [
    { payment_intent: 'pi_123' },
    { idempotencyKey: 'order-refund-13-98' },
  ]);
});
