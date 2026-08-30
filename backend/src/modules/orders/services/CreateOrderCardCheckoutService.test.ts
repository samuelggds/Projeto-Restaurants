// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { BUSINESS_DAY_IDS } from '../../restaurantSettings/utils/businessHours.js';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';

const originalHttpCreateServer = http.createServer;

http.createServer = ((...args) => {
  const server = originalHttpCreateServer(...args);
  server.listen = () => server;
  return server;
}) as typeof http.createServer;

const [{ default: createOrderService }, { default: createOrderCardCheckoutService }] =
  await Promise.all([
    import('./CreateOrderService.js'),
    import('./CreateOrderCardCheckoutService.js'),
  ]);

http.createServer = originalHttpCreateServer;

const originalRepositoryMethods = {
  findByRestaurantId: restaurantSettingsRepository.findByRestaurantId,
};

const originalCreateOrderExecute = createOrderService.execute;
const originalSetCardCheckoutSessionId = orderRepository.setCardCheckoutSessionId;
const originalDeleteById = orderRepository.deleteById;
const originalFindCustomerPaymentMethod = prisma.customerPaymentMethod.findFirst;
const originalFetch = globalThis.fetch;

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId = originalRepositoryMethods.findByRestaurantId;
  createOrderService.execute = originalCreateOrderExecute;
  orderRepository.setCardCheckoutSessionId = originalSetCardCheckoutSessionId;
  orderRepository.deleteById = originalDeleteById;
  prisma.customerPaymentMethod.findFirst = originalFindCustomerPaymentMethod;
  globalThis.fetch = originalFetch;
  delete process.env.BACKEND_URL;
  delete process.env.PAGBANK_EMAIL;
  delete process.env.PAGBANK_TOKEN;
  delete process.env.ASAAS_PLATFORM_WALLET_ID;
});

test('não cria checkout de cartão fora da agenda semanal', async () => {
  let createOrderCalled = false;
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    isOpenForOrders: true,
    businessHours: BUSINESS_DAY_IDS.map((id) => ({
      id,
      label: id,
      enabled: false,
      openingTime: '11:00',
      closingTime: '23:00',
    })),
    cardGateway: 'PAGBANK',
  });
  createOrderService.execute = async () => {
    createOrderCalled = true;
    throw new Error('não deveria criar pedido');
  };

  await assert.rejects(
    () =>
      createOrderCardCheckoutService.execute({
        restaurantId: 7,
        userRestaurantId: 7,
        type: 'RETIRADA',
        paymentMethod: 'CARTAO',
        items: [{ productId: 1, quantity: 1 }],
        customerName: 'Cliente',
      }),
    /restaurante está fechado/i,
  );
  assert.equal(createOrderCalled, false);
});

test('não cria checkout quando o restaurante desativou pagamentos com cartão', async () => {
  let createOrderCalled = false;
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    isOpenForOrders: true,
    businessHours: [],
    acceptsCard: false,
    cardGateway: 'PAGBANK',
  });
  createOrderService.execute = async () => {
    createOrderCalled = true;
    throw new Error('não deveria criar pedido');
  };

  await assert.rejects(
    () =>
      createOrderCardCheckoutService.execute({
        restaurantId: 7,
        userRestaurantId: 7,
        type: 'RETIRADA',
        paymentMethod: 'CARTAO',
        items: [{ productId: 1, quantity: 1 }],
        customerName: 'Cliente',
      }),
    /não está aceitando pagamentos com cartão/i,
  );
  assert.equal(createOrderCalled, false);
});

test('deve abrir checkout de cartao usando a configuracao PagBank do restaurante', async () => {
  let savedSessionId = null;
  let deletedOrderId = null;

  restaurantSettingsRepository.findByRestaurantId = async () => ({
    cardGateway: 'PAGBANK',
    pagbankEmail: 'dono@pizzaria.com',
    pagbankToken: 'token-real',
  });

  createOrderService.execute = async () => ({
    id: 321,
    restaurantId: 7,
    total: 79.9,
    restaurant: {
      name: 'Pizzaria do Carlos',
    },
  });

  orderRepository.setCardCheckoutSessionId = async (_orderId, _restaurantId, sessionId) => {
    savedSessionId = sessionId;
  };

  orderRepository.deleteById = async (orderId) => {
    deletedOrderId = orderId;
  };

  globalThis.fetch = async () =>
    new Response('<checkout><code>CHK-ABC-123</code></checkout>', {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    });

  const result = await createOrderCardCheckoutService.execute({
    restaurantId: 7,
    userRestaurantId: 7,
    cardProvider: 'STRIPE',
    type: 'DELIVERY',
    paymentMethod: 'CARTAO',
    items: [{ productId: 1, quantity: 2 }],
    customerName: 'Carlos Silva',
    customerCpf: '12345678900',
    customerPhone: '11999998888',
    successUrl: 'http://frontend.local/cart/sucesso',
    cancelUrl: 'http://frontend.local/cart/cancelado',
  });

  assert.equal(result.orderId, 321);
  assert.equal(result.provider, 'PAGBANK');
  assert.equal(result.sessionId, 'CHK-ABC-123');
  assert.equal(
    result.checkoutUrl,
    'https://pagseguro.uol.com.br/v2/checkout/payment.html?code=CHK-ABC-123',
  );
  assert.equal(savedSessionId, 'pagbank_chk:CHK-ABC-123');
  assert.equal(deletedOrderId, null);
});

test('deve abrir checkout de cartao com Asaas e fazer fallback sem split quando rejeitado', async () => {
  let savedSessionId = null;
  let deletedOrderId = null;
  const paymentBodies = [];

  process.env.ASAAS_PLATFORM_WALLET_ID = 'wallet-platform-xyz';

  restaurantSettingsRepository.findByRestaurantId = async () => ({
    cardGateway: 'ASAAS',
    asaasAccessToken: 'asaas-token-restaurante',
    gatewayMerchantId: 'wallet-restaurant-123',
  });

  createOrderService.execute = async () => ({
    id: 654,
    restaurantId: 9,
    total: 112.5,
    systemFee: 4.5,
    restaurant: {
      name: 'Pizzaria da Ana',
    },
  });

  orderRepository.setCardCheckoutSessionId = async (_orderId, _restaurantId, sessionId) => {
    savedSessionId = sessionId;
  };

  orderRepository.deleteById = async (orderId) => {
    deletedOrderId = orderId;
  };

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input || '');

    if (url.endsWith('/v3/customers')) {
      return new Response(JSON.stringify({ id: 'cus_001' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.endsWith('/v3/payments')) {
      const body = JSON.parse(String(init.body || '{}'));
      paymentBodies.push(body);

      if (paymentBodies.length === 1) {
        return new Response(
          JSON.stringify({
            errors: [{ description: 'split not allowed for this account' }],
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      return new Response(
        JSON.stringify({
          id: 'pay_asaas_777',
          invoiceUrl: 'https://sandbox.asaas.com/i/pay_asaas_777',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify({ errors: [] }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await createOrderCardCheckoutService.execute({
    restaurantId: 9,
    userRestaurantId: 9,
    type: 'DELIVERY',
    paymentMethod: 'CARTAO',
    items: [{ productId: 1, quantity: 1 }],
    customerName: 'Ana Souza',
    customerCpf: '12345678901',
    customerPhone: '11999888777',
  });

  assert.equal(result.orderId, 654);
  assert.equal(result.provider, 'ASAAS');
  assert.equal(result.sessionId, 'pay_asaas_777');
  assert.equal(result.checkoutUrl, 'https://sandbox.asaas.com/i/pay_asaas_777');
  assert.equal(savedSessionId, 'asaas_pay:pay_asaas_777');
  assert.equal(deletedOrderId, null);
  assert.equal(paymentBodies.length, 2);
  assert.ok(Array.isArray(paymentBodies[0].split));
  assert.equal(paymentBodies[1].split, undefined);
});

test('deve reutilizar token Asaas sem expor os dados completos do cartão', async () => {
  let paymentBody = null;
  let savedSessionId = null;

  restaurantSettingsRepository.findByRestaurantId = async () => ({
    cardGateway: 'ASAAS',
    asaasAccessToken: 'asaas-token-restaurante',
  });
  createOrderService.execute = async () => ({
    id: 655,
    restaurantId: 9,
    total: 89.9,
    systemFee: 0,
    restaurant: { name: 'Pizzaria da Ana' },
  });
  prisma.customerPaymentMethod.findFirst = async () => ({
    publicId: 'saved-card-public-id',
    providerCustomerId: 'cus_saved_001',
    providerPaymentMethodId: 'tok_saved_001',
    active: true,
  });
  orderRepository.setCardCheckoutSessionId = async (_orderId, _restaurantId, sessionId) => {
    savedSessionId = sessionId;
  };
  globalThis.fetch = async (input, init = {}) => {
    assert.match(String(input), /\/v3\/payments$/);
    paymentBody = JSON.parse(String(init.body || '{}'));
    return new Response(JSON.stringify({ id: 'pay_saved_001', status: 'PENDING' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await createOrderCardCheckoutService.execute({
    userId: 33,
    restaurantId: 9,
    userRestaurantId: 9,
    type: 'DELIVERY',
    paymentMethod: 'CARTAO',
    paymentMethodId: 'saved-card-public-id',
    customerIp: '203.0.113.42',
    items: [{ productId: 1, quantity: 1 }],
    successUrl: 'https://pedido.local/sucesso',
  });

  assert.equal(result.provider, 'ASAAS');
  assert.equal(result.sessionId, 'pay_saved_001');
  assert.equal(result.paid, false);
  assert.equal(savedSessionId, 'asaas_pay:pay_saved_001');
  assert.deepEqual(paymentBody, {
    customer: 'cus_saved_001',
    billingType: 'CREDIT_CARD',
    value: 89.9,
    dueDate: new Date().toISOString().slice(0, 10),
    description: 'Pedido #655',
    externalReference: 'ordercard:655:9',
    creditCardToken: 'tok_saved_001',
    remoteIp: '203.0.113.42',
  });
});
