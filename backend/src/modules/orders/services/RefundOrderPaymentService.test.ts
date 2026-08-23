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

test('bloqueia PIX PagBank antes de chamar qualquer API de outro provedor', async () => {
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('nao deveria chamar fetch');
  };

  await assert.rejects(
    () =>
      refundOrderPaymentService.execute({
        id: 93,
        restaurantId: 9,
        total: 30,
        paid: true,
        paymentMethod: 'PIX',
        pixPaymentId: 'pagbank:ORDE_123',
      }),
    /PIX PagBank ainda nao e suportado.*Nenhuma alteracao foi aplicada/i,
  );
  assert.equal(fetchCalls, 0);
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
    /PagBank sem suporte de estorno automatico.*Nenhuma alteracao foi aplicada/i,
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
        'Falha ao estornar pagamento no Asaas (HTTP 400). Nenhuma alteracao foi aplicada ao pedido.',
      );
      assert.equal(error.message.includes('detalhe interno'), false);
      assert.equal(error.message.includes('token-tenant'), false);
      return true;
    },
  );
});
