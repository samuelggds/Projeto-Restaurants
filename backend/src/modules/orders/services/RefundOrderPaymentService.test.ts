// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import refundOrderPaymentService from './RefundOrderPaymentService.js';

const originalFindByRestaurantId = restaurantSettingsRepository.findByRestaurantId;
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const originalEnv = {
  ALLOW_GLOBAL_PAYMENT_FALLBACK: process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK,
  ASAAS_API_BASE_URL: process.env.ASAAS_API_BASE_URL,
  ASAAS_API_KEY: process.env.ASAAS_API_KEY,
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
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
  restoreEnv('ALLOW_GLOBAL_PAYMENT_FALLBACK');
  restoreEnv('ASAAS_API_BASE_URL');
  restoreEnv('ASAAS_API_KEY');
  restoreEnv('MP_ACCESS_TOKEN');
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
    const submitted = Boolean(request);
    if (init.method === 'POST') request = { url: String(input), init };
    return new Response(
      JSON.stringify({
        id: 'pay_pix_123',
        value: 49.9,
        externalReference: 'orderpix:7:91',
        status: submitted ? 'REFUNDED' : 'RECEIVED',
        refunds: submitted ? [{ status: 'DONE', value: 49.9 }] : [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
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
    const submitted = Boolean(request);
    if (init.method === 'POST') request = { url: String(input), init };
    return new Response(
      JSON.stringify({
        id: 'pay_card_456',
        value: 110.5,
        externalReference: 'ordercard:92:8',
        status: submitted ? 'REFUNDED' : 'RECEIVED',
        refunds: submitted ? [{ status: 'DONE', value: 110.5 }] : [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
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
        'O estorno Asaas aguarda confirmação. O pedido não foi cancelado. Consulte novamente para conciliar, sem gerar outro estorno.',
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

test('estorna cartão Mercado Pago criado pela Orders API pelo provedor correto', async () => {
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 12);
    return {
      mercadoPagoAccessToken: 'mp-order-token-12',
      mercadoPagoRefreshToken: 'refresh-12',
      mercadoPagoTokenExpiresAt: new Date(Date.now() + 3_600_000),
    };
  };


  let request = null;
  globalThis.fetch = async (input, init = {}) => {
    request = { url: String(input), init };
    return new Response(
      JSON.stringify({
        id: 'ORD_CARD_123',
        status: 'refunded',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const receipt = await refundOrderPaymentService.execute(
    {
      id: 99,
      restaurantId: 12,
      total: 1,
      paid: true,
      paymentMethod: 'CARTAO',
      cardCheckoutSessionId: 'mp_order:ORD_CARD_123',
    },
    { idempotencyKey: 'order-refund-12-99' },
  );

  assert.deepEqual(receipt, {
    provider: 'MERCADO_PAGO',
    externalId: 'ORD_CARD_123',
  });
  assert.equal(request.url, 'https://api.mercadopago.com/v1/orders/ORD_CARD_123/refund');
  assert.equal(request.init.method, 'POST');
  assert.equal(new Headers(request.init.headers).get('authorization'), 'Bearer mp-order-token-12');
  assert.equal(new Headers(request.init.headers).get('x-idempotency-key'), 'order-refund-12-99');
});

for (const scenario of ['PENDING', 'CANCELLED', 'PARTIAL', 'WRONG_REFERENCE', 'TIMEOUT', 'DONE']) {
  test(`Asaas concilia ${scenario} sem repetir o POST nem assumir sucesso HTTP`, async () => {
    restaurantSettingsRepository.findByRestaurantId = async () => ({
      asaasAccessToken: 'tenant-test',
    });
    let posts = 0;
    globalThis.fetch = async (_input, init = {}) => {
      if (init.method === 'POST') posts++;
      if (scenario === 'TIMEOUT') throw new Error('timeout');
      return Response.json({
        id: 'pay_safe',
        value: 60,
        externalReference: scenario === 'WRONG_REFERENCE' ? 'orderpix:99:99' : 'orderpix:11:95',
        status: 'REFUNDED',
        refunds: [
          {
            status: scenario === 'PARTIAL' ? 'DONE' : scenario,
            value: scenario === 'PARTIAL' ? 30 : 60,
          },
        ],
      });
    };
    const operation = refundOrderPaymentService.execute(
      {
        id: 95,
        restaurantId: 11,
        total: 60,
        paid: true,
        paymentMethod: 'PIX',
        pixPaymentId: 'asaas:pay_safe',
      },
      { reconcileOnly: true },
    );
    if (scenario === 'DONE') assert.equal((await operation).provider, 'ASAAS');
    else await assert.rejects(operation, { code: 'REFUND_PENDING' });
    assert.equal(posts, 0);
  });
}
