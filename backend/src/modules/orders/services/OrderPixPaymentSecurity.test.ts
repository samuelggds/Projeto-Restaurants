// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import orderRepository from '../repositories/OrderRepository.js';
import orderPixPaymentService from './OrderPixPaymentService.js';

const originalFindByRestaurantId = restaurantSettingsRepository.findByRestaurantId;
const originalFetch = globalThis.fetch;
const originalAsaasBaseUrl = process.env.ASAAS_API_BASE_URL;
const originalPagBankBaseUrl = process.env.PAGBANK_API_BASE_URL;
const originalGetPaymentStatus = orderPixPaymentService.getPaymentStatus;
const originalGetMercadoPagoPaymentApi = orderPixPaymentService.getMercadoPagoPaymentApi;

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId = originalFindByRestaurantId;
  globalThis.fetch = originalFetch;
  orderPixPaymentService.getPaymentStatus = originalGetPaymentStatus;
  orderPixPaymentService.getMercadoPagoPaymentApi = originalGetMercadoPagoPaymentApi;

  if (originalAsaasBaseUrl === undefined) {
    delete process.env.ASAAS_API_BASE_URL;
  } else {
    process.env.ASAAS_API_BASE_URL = originalAsaasBaseUrl;
  }

  if (originalPagBankBaseUrl === undefined) {
    delete process.env.PAGBANK_API_BASE_URL;
  } else {
    process.env.PAGBANK_API_BASE_URL = originalPagBankBaseUrl;
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

test('confirma Mercado Pago somente com referência, valor e moeda do pedido', async () => {
  orderPixPaymentService.getPaymentStatus = async () => ({
    paymentId: 'mp_123',
    status: 'approved',
    provider: 'MERCADO_PAGO',
    isApproved: true,
    sameRestaurant: true,
    externalReference: 'orderpix:7:91',
    amount: 49.9,
    currency: 'BRL',
    requiresStatusCheck: true,
  });

  const result = await orderPixPaymentService.ensurePaymentApproved({
    paymentId: 'mp_123',
    restaurantId: 7,
    expectedOrderId: 91,
    expectedAmount: 49.9,
    expectedCurrency: 'BRL',
  });

  assert.equal(result.isApproved, true);
});

test('rejeita Mercado Pago aprovado com vínculo financeiro divergente', async () => {
  const approvedPayment = {
    paymentId: 'mp_123',
    status: 'approved',
    provider: 'MERCADO_PAGO',
    isApproved: true,
    sameRestaurant: true,
    externalReference: 'orderpix:7:91',
    amount: 49.9,
    currency: 'BRL',
    requiresStatusCheck: true,
  };

  orderPixPaymentService.getPaymentStatus = async () => ({
    ...approvedPayment,
    externalReference: 'orderpix:7:90',
  });
  await assert.rejects(
    () =>
      orderPixPaymentService.ensurePaymentApproved({
        paymentId: 'mp_123',
        restaurantId: 7,
        expectedOrderId: 91,
        expectedAmount: 49.9,
      }),
    /não corresponde ao pedido informado/i,
  );

  orderPixPaymentService.getPaymentStatus = async () => ({
    ...approvedPayment,
    amount: 10,
  });
  await assert.rejects(
    () =>
      orderPixPaymentService.ensurePaymentApproved({
        paymentId: 'mp_123',
        restaurantId: 7,
        expectedOrderId: 91,
        expectedAmount: 49.9,
      }),
    /valor do pagamento PIX não corresponde/i,
  );

  orderPixPaymentService.getPaymentStatus = async () => ({
    ...approvedPayment,
    currency: 'USD',
  });
  await assert.rejects(
    () =>
      orderPixPaymentService.ensurePaymentApproved({
        paymentId: 'mp_123',
        restaurantId: 7,
        expectedOrderId: 91,
        expectedAmount: 49.9,
      }),
    /moeda do pagamento PIX não corresponde/i,
  );
});

test('aplica as mesmas invariantes financeiras ao Pix PagBank', async () => {
  orderPixPaymentService.getPaymentStatus = async () => ({
    paymentId: 'pagbank:pay_123',
    status: 'paid',
    provider: 'PAGBANK',
    isApproved: true,
    sameRestaurant: true,
    externalReference: 'orderpix:7:91',
    amount: 49.9,
    currency: 'BRL',
    requiresStatusCheck: true,
  });

  const result = await orderPixPaymentService.ensurePaymentApproved({
    paymentId: 'pagbank:pay_123',
    restaurantId: 7,
    expectedOrderId: 91,
    expectedAmount: 49.9,
  });

  assert.equal(result.isApproved, true);
});

test('normaliza referência, valor e moeda retornados pelo Mercado Pago', async () => {
  orderPixPaymentService.getMercadoPagoPaymentApi = async () => ({
    get: async () => ({
      id: 123,
      status: 'approved',
      external_reference: 'orderpix:7:91',
      transaction_amount: 49.9,
      currency_id: 'BRL',
      metadata: { restaurant_id: '7' },
    }),
  });

  const result = await orderPixPaymentService.getPaymentStatus({
    paymentId: '123',
    restaurantId: 7,
  });

  assert.equal(result.externalReference, 'orderpix:7:91');
  assert.equal(result.amount, 49.9);
  assert.equal(result.currency, 'BRL');
  assert.equal(result.sameRestaurant, true);
});

test('normaliza referência, centavos e moeda retornados pelo PagBank', async () => {
  process.env.PAGBANK_API_BASE_URL = 'https://sandbox.pagbank.test';
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return { pagbankToken: 'token-tenant-7' };
  };
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(String(input), 'https://sandbox.pagbank.test/orders/pay_123');
    assert.equal(init.headers.Authorization, 'Bearer token-tenant-7');
    return new Response(
      JSON.stringify({
        id: 'pay_123',
        reference_id: 'orderpix:7:91',
        charges: [{ status: 'PAID', amount: { value: 4_990, currency: 'BRL' } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await orderPixPaymentService.getPaymentStatus({
    paymentId: 'pagbank:pay_123',
    restaurantId: 7,
  });

  assert.equal(result.externalReference, 'orderpix:7:91');
  assert.equal(result.amount, 49.9);
  assert.equal(result.currency, 'BRL');
  assert.equal(result.isApproved, true);
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
