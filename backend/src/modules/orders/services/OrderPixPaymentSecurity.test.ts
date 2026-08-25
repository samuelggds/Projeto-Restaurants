// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import orderRepository from '../repositories/OrderRepository.js';
import orderPixPaymentService from './OrderPixPaymentService.js';

const originalFindByRestaurantId = restaurantSettingsRepository.findByRestaurantId;
const originalFetch = globalThis.fetch;
const originalAsaasBaseUrl = process.env.ASAAS_API_BASE_URL;

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId = originalFindByRestaurantId;
  globalThis.fetch = originalFetch;

  if (originalAsaasBaseUrl === undefined) {
    delete process.env.ASAAS_API_BASE_URL;
  } else {
    process.env.ASAAS_API_BASE_URL = originalAsaasBaseUrl;
  }
});

function arrangeAsaasPayment(payment) {
  process.env.ASAAS_API_BASE_URL = 'https://sandbox.asaas.test';
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return { asaasAccessToken: 'token-tenant-7' };
  };

  globalThis.fetch = async (input, init = {}) => {
    assert.equal(String(input), 'https://sandbox.asaas.test/v3/payments/pay_123');
    assert.equal(init.method, 'GET');
    assert.equal(init.headers.access_token, 'token-tenant-7');
    return new Response(JSON.stringify(payment), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

test('confirma pagamento Asaas somente com referência, valor e moeda do pedido', async () => {
  arrangeAsaasPayment({
    id: 'pay_123',
    status: 'RECEIVED',
    externalReference: 'orderpix:7:91',
    value: 49.9,
    currency: 'BRL',
  });

  const result = await orderPixPaymentService.ensurePaymentApproved({
    paymentId: 'asaas:pay_123',
    restaurantId: 7,
    expectedOrderId: 91,
    expectedAmount: '49.90',
    expectedCurrency: 'BRL',
  });

  assert.equal(result.isApproved, true);
  assert.equal(result.externalReference, 'orderpix:7:91');
  assert.equal(result.amount, 49.9);
  assert.equal(result.currency, 'BRL');
});

test('rejeita pagamento Asaas aprovado com valor diferente do total do pedido', async () => {
  arrangeAsaasPayment({
    id: 'pay_123',
    status: 'CONFIRMED',
    externalReference: 'orderpix:7:91',
    value: 10,
    currency: 'BRL',
  });

  await assert.rejects(
    () =>
      orderPixPaymentService.ensurePaymentApproved({
        paymentId: 'asaas:pay_123',
        restaurantId: 7,
        expectedOrderId: 91,
        expectedAmount: 49.9,
        expectedCurrency: 'BRL',
      }),
    /valor do pagamento PIX não corresponde/i,
  );
});

test('rejeita pagamento Asaas criado para outro pedido', async () => {
  arrangeAsaasPayment({
    id: 'pay_123',
    status: 'RECEIVED',
    externalReference: 'orderpix:7:90',
    value: 49.9,
    currency: 'BRL',
  });

  await assert.rejects(
    () =>
      orderPixPaymentService.ensurePaymentApproved({
        paymentId: 'asaas:pay_123',
        restaurantId: 7,
        expectedOrderId: 91,
        expectedAmount: 49.9,
        expectedCurrency: 'BRL',
      }),
    /não corresponde ao pedido informado/i,
  );
});

test('não permite reutilizar pixPaymentId já vinculado a outro pedido', async () => {
  let updateCalled = false;
  const db = {
    order: {
      findFirst: async () => ({ id: 90 }),
      updateMany: async () => {
        updateCalled = true;
        return { count: 1 };
      },
    },
  };

  await assert.rejects(
    () => orderRepository.claimPixPaymentId(91, 7, 'asaas:pay_123', db),
    /já foi utilizado em outro pedido/i,
  );
  assert.equal(updateCalled, false);
});
