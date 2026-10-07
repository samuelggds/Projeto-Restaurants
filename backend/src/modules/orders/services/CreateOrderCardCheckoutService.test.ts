// @ts-nocheck
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { BUSINESS_DAY_IDS } from '../../restaurantSettings/utils/businessHours.js';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';
import { PaymentCreationUncertainError } from './PaymentCreationUncertainError.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';

const originalHttpCreateServer = http.createServer;

http.createServer = ((...args) => {
  const server = originalHttpCreateServer(...args);
  server.listen = () => server;
  return server;
}) as typeof http.createServer;

const [
  { default: createOrderService },
  { default: createOrderCardCheckoutService },
  { default: finalizeOrderCardPaymentService },
  { default: directOrderCardPaymentService },
] = await Promise.all([
  import('./CreateOrderService.js'),
  import('./CreateOrderCardCheckoutService.js'),
  import('./FinalizeOrderCardPaymentService.js'),
  import('./DirectOrderCardPaymentService.js'),
]);

http.createServer = originalHttpCreateServer;

const originalRepositoryMethods = {
  findByRestaurantId: restaurantSettingsRepository.findByRestaurantId,
};

const originalCreateOrderExecute = createOrderService.execute;
const originalFinalizeOrderCardPaymentExecute = finalizeOrderCardPaymentService.execute;
const originalDirectOrderCardPaymentExecute = directOrderCardPaymentService.execute;
const originalSetCardCheckoutSessionId = orderRepository.setCardCheckoutSessionId;
const originalDeleteById = orderRepository.deleteById;
const originalCreatePaymentAttempt = orderPaymentAttemptRepository.createCardAttempt;
const originalUpdatePaymentAttempt = orderPaymentAttemptRepository.update;
const originalTransaction = prisma.$transaction;
const originalQueryRaw = prisma.$queryRaw;
const originalFetch = globalThis.fetch;
const originalFutureProviders = process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS;
const originalFrontendUrl = process.env.FRONTEND_URL;

function readyMercadoPagoSettings() {
  return {
    mercadoPagoAccessToken: 'test-mp-access',
    mercadoPagoRefreshToken: 'test-mp-refresh',
    mercadoPagoTokenExpiresAt: new Date(Date.now() + 3_600_000),
    mercadoPagoPublicKey: 'TEST-public-key',
  };
}

test('timeout após cobrança de cartão preserva pedido confirmado, estoque e cupom', async () => {
  process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS = 'true';
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    cardGateway: 'ASAAS',
    asaasAccessToken: 'tenant-token',
  });
  const order = {
    id: 321,
    publicId: 'order-321',
    restaurantId: 7,
    total: 25,
    paid: false,
    restaurant: { name: 'Restaurante' },
  };
  createOrderService.execute = async () => order;
  let deleted = false;
  orderRepository.deleteById = async () => {
    deleted = true;
  };
  prisma.$transaction = async () => {
    throw new Error('Não deve liberar reservas após falha externa.');
  };
  globalThis.fetch = async () => {
    order.paid = true;
    throw new Error('timeout-token-secret');
  };
  await assert.rejects(
    () =>
      createOrderCardCheckoutService.execute({
        restaurantId: 7,
        userRestaurantId: 7,
        type: 'RETIRADA',
        paymentMethod: 'CARTAO',
        items: [{ productId: 1, quantity: 1 }],
      }),
    (error) =>
      error instanceof PaymentCreationUncertainError &&
      error.orderId === 321 &&
      error.orderPublicId === 'order-321' &&
      !error.message.includes('token-secret'),
  );
  assert.equal(order.paid, true);
  assert.equal(deleted, false);
});

beforeEach(() => {
  process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS = 'true';
  process.env.FRONTEND_URL = 'https://pedido.local';
  let attemptId = 0;
  orderPaymentAttemptRepository.createCardAttempt = async () => {
    attemptId += 1;
    return {
      id: attemptId,
      publicId: `22222222-2222-4222-8222-${String(attemptId).padStart(12, '0')}`,
      idempotencyKey: `11111111-1111-4111-8111-${String(attemptId).padStart(12, '0')}`,
      status: 'PENDING',
    } as never;
  };
  orderPaymentAttemptRepository.update = async (_id, _restaurantId, status, diagnostic) =>
    ({ id: _id, status, ...(diagnostic || {}) }) as never;
  prisma.$transaction = async (callback) => callback(prisma);
  prisma.$queryRaw = async () => [{ set_config: '9' }];
});

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId = originalRepositoryMethods.findByRestaurantId;
  createOrderService.execute = originalCreateOrderExecute;
  finalizeOrderCardPaymentService.execute = originalFinalizeOrderCardPaymentExecute;
  directOrderCardPaymentService.execute = originalDirectOrderCardPaymentExecute;
  orderRepository.setCardCheckoutSessionId = originalSetCardCheckoutSessionId;
  orderRepository.deleteById = originalDeleteById;
  orderPaymentAttemptRepository.createCardAttempt = originalCreatePaymentAttempt;
  orderPaymentAttemptRepository.update = originalUpdatePaymentAttempt;
  prisma.$transaction = originalTransaction;
  prisma.$queryRaw = originalQueryRaw;
  globalThis.fetch = originalFetch;
  delete process.env.BACKEND_URL;
  if (originalFutureProviders === undefined) delete process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS;
  else process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS = originalFutureProviders;
  if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = originalFrontendUrl;
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
    cardGateway: 'MERCADO_PAGO',
    ...readyMercadoPagoSettings(),
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
    cardGateway: 'MERCADO_PAGO',
    ...readyMercadoPagoSettings(),
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

test('não cria pedido quando o Mercado Pago conectado exige reconexão', async () => {
  let createOrderCalled = false;
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    restaurantId: 9,
    isOpenForOrders: true,
    businessHours: [],
    acceptsCard: true,
    cardGateway: 'MERCADO_PAGO',
    mercadoPagoAccessToken: 'legacy-access',
    mercadoPagoRefreshToken: null,
    mercadoPagoPublicKey: 'TEST-public-key',
  });
  createOrderService.execute = async () => {
    createOrderCalled = true;
    throw new Error('não deveria criar pedido');
  };

  await assert.rejects(
    () =>
      createOrderCardCheckoutService.execute({
        restaurantId: 9,
        userRestaurantId: 9,
        type: 'RETIRADA',
        paymentMethod: 'CARTAO',
        cardPaymentType: 'credit',
        cardToken: 'test-token',
        cardPaymentMethodId: 'visa',
        items: [{ productId: 1, quantity: 1 }],
      }),
    /reconecte o Mercado Pago/i,
  );

  assert.equal(createOrderCalled, false);
});

test('orquestra débito mantendo tipo explícito e tenant do restaurante', async () => {
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(Number(restaurantId), 9);
    return {
      restaurantId: 9,
      isOpenForOrders: true,
      businessHours: [],
      acceptsCard: true,
      cardGateway: 'MERCADO_PAGO',
      ...readyMercadoPagoSettings(),
    };
  };

  createOrderService.execute = async (payload) => {
    assert.equal(Number(payload.restaurantId), 9);
    assert.equal(payload.paymentMethod, 'CARTAO');
    assert.equal(payload.paid, false);
    assert.equal('cardToken' in payload, false);
    assert.equal('cardPaymentMethodId' in payload, false);
    assert.equal('cardPaymentType' in payload, false);
    assert.equal('cardBrand' in payload, false);
    assert.equal('cardLast4' in payload, false);
    assert.equal('cardData' in payload, false);
    assert.equal('holderTaxId' in payload, false);
    assert.equal('payerEmail' in payload, false);
    assert.equal('mercadoPagoDeviceId' in payload, false);
    return {
      id: 660,
      publicId: '123e4567-e89b-42d3-a456-426614174660',
      restaurantId: 9,
      total: 55,
      systemFee: 0,
      restaurant: { name: 'Restaurante 9' },
    };
  };

  let receivedPayload: Record<string, unknown> | null = null;
  let attemptCardPaymentType = '';
  let attemptCardBrand = '';
  let attemptCardLast4 = '';
  orderPaymentAttemptRepository.createCardAttempt = async (input) => {
    attemptCardPaymentType = String(input.cardPaymentType || '');
    attemptCardBrand = String(input.cardBrand || '');
    attemptCardLast4 = String(input.cardLast4 || '');
    return {
      id: 660,
      publicId: '22222222-2222-4222-8222-000000000660',
      idempotencyKey: '11111111-1111-4111-8111-000000000660',
      status: 'PENDING',
    } as never;
  };
  directOrderCardPaymentService.execute = async (input) => {
    assert.equal(input.provider, 'MERCADO_PAGO');
    assert.equal(input.order.restaurantId, 9);
    assert.equal(input.order.externalReference, 'ordercard_660_9_22222222222242228222000000000660');
    receivedPayload = input.payload as Record<string, unknown>;
    return {
      provider: 'MERCADO_PAGO',
      sessionId: 'debit-order-660',
      persistenceSessionId: 'mp_order:debit-order-660',
      checkoutUrl: 'https://payments.example.test/debit/660',
      paymentApproved: false,
    };
  };

  orderRepository.setCardCheckoutSessionId = async (orderId, restaurantId, sessionId) => {
    assert.equal(orderId, 660);
    assert.equal(restaurantId, 9);
    assert.equal(sessionId, 'mp_order:debit-order-660');
  };

  const result = await createOrderCardCheckoutService.execute({
    restaurantId: 9,
    userRestaurantId: 9,
    type: 'RETIRADA',
    paymentMethod: 'CARTAO',
    cardPaymentType: 'debit',
    cardToken: 'test-debit-token',
    cardPaymentMethodId: 'visa',
    cardBrand: 'visa',
    cardLast4: '4242',
    items: [{ productId: 1, quantity: 1 }],
  });

  assert.equal(attemptCardPaymentType, 'debit');
  assert.equal(attemptCardBrand, 'visa');
  assert.equal(attemptCardLast4, '4242');
  assert.equal(receivedPayload?.cardPaymentType, 'debit');
  assert.equal(receivedPayload?.cardToken, 'test-debit-token');
  assert.equal(result.provider, 'MERCADO_PAGO');
  assert.equal(result.paid, false);
});

test('recusa débito em gateway não homologado antes de criar o pedido', async () => {
  let createOrderCalled = false;
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    restaurantId: 9,
    isOpenForOrders: true,
    businessHours: [],
    acceptsCard: true,
    cardGateway: 'ASAAS',
    asaasAccessToken: 'test-only-tenant-token',
  });
  createOrderService.execute = async () => {
    createOrderCalled = true;
    throw new Error('não deveria criar pedido');
  };

  await assert.rejects(
    () =>
      createOrderCardCheckoutService.execute({
        restaurantId: 9,
        userRestaurantId: 9,
        type: 'RETIRADA',
        paymentMethod: 'CARTAO',
        cardPaymentType: 'debit',
        cardToken: 'test-debit-token',
        cardPaymentMethodId: 'visa',
        items: [{ productId: 1, quantity: 1 }],
      }),
    /débito online ainda não está disponível/i,
  );

  assert.equal(createOrderCalled, false);
});

test('recusa débito sem token antes de criar pedido ou abrir checkout de crédito', async () => {
  let createOrderCalled = false;
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    restaurantId: 9,
    isOpenForOrders: true,
    businessHours: [],
    acceptsCard: true,
    cardGateway: 'MERCADO_PAGO',
    ...readyMercadoPagoSettings(),
  });
  createOrderService.execute = async () => {
    createOrderCalled = true;
    throw new Error('não deveria criar pedido');
  };

  await assert.rejects(
    () =>
      createOrderCardCheckoutService.execute({
        restaurantId: 9,
        userRestaurantId: 9,
        type: 'RETIRADA',
        paymentMethod: 'CARTAO',
        cardPaymentType: 'debit',
        items: [{ productId: 1, quantity: 1 }],
      }),
    /dados do cartão de débito/i,
  );

  assert.equal(createOrderCalled, false);
});

test('recusa tipo de cartão manipulado antes de criar o pedido', async () => {
  let createOrderCalled = false;
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    restaurantId: 9,
    isOpenForOrders: true,
    businessHours: [],
    acceptsCard: true,
    cardGateway: 'MERCADO_PAGO',
    ...readyMercadoPagoSettings(),
  });
  createOrderService.execute = async () => {
    createOrderCalled = true;
    throw new Error('não deveria criar pedido');
  };

  await assert.rejects(
    () =>
      createOrderCardCheckoutService.execute({
        restaurantId: 9,
        userRestaurantId: 9,
        type: 'RETIRADA',
        paymentMethod: 'CARTAO',
        cardPaymentType: 'debit-manipulado',
        cardToken: 'test-token',
        cardPaymentMethodId: 'visa',
        items: [{ productId: 1, quantity: 1 }],
      } as never),
    /tipo de cartão inválido/i,
  );

  assert.equal(createOrderCalled, false);
});

test('checkout Asaas usa somente a conta do restaurante e nunca envia split', async () => {
  let savedSessionId = null;
  let deletedOrderId = null;
  const paymentBodies = [];

  restaurantSettingsRepository.findByRestaurantId = async () => ({
    cardGateway: 'ASAAS',
    asaasAccessToken: 'asaas-token-restaurante',
  });

  createOrderService.execute = async () => ({
    id: 654,
    publicId: '123e4567-e89b-42d3-a456-426614174001',
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
    successUrl: 'https://pedido.local/card-return',
  });

  assert.equal(result.orderId, 654);
  assert.equal(result.provider, 'ASAAS');
  assert.equal(result.sessionId, 'pay_asaas_777');
  assert.equal(result.checkoutUrl, 'https://sandbox.asaas.com/i/pay_asaas_777');
  assert.equal(savedSessionId, 'asaas_pay:pay_asaas_777');
  assert.equal(deletedOrderId, null);
  assert.equal(paymentBodies.length, 1);
  assert.equal(Object.hasOwn(paymentBodies[0], 'split'), false);
  assert.equal(paymentBodies[0].externalReference, 'ordercard:654:9');
  assert.deepEqual(paymentBodies[0].callback, {
    successUrl:
      'https://pedido.local/card-return?cardCheckoutStatus=success&orderPublicId=123e4567-e89b-42d3-a456-426614174001',
    autoRedirect: true,
  });
});

test('rejeita cartão salvo antes de criar pedido ou chamar provedor', async () => {
  let createOrderCalls = 0;
  let providerCalls = 0;

  restaurantSettingsRepository.findByRestaurantId = async () => ({
    cardGateway: 'MERCADO_PAGO',
    ...readyMercadoPagoSettings(),
  });
  createOrderService.execute = async () => {
    createOrderCalls += 1;
    throw new Error('não deveria criar pedido');
  };
  globalThis.fetch = async () => {
    providerCalls += 1;
    return Response.json({}, { status: 500 });
  };

  await assert.rejects(
    createOrderCardCheckoutService.execute({
      userId: 33,
      restaurantId: 9,
      userRestaurantId: 9,
      type: 'DELIVERY',
      paymentMethod: 'CARTAO',
      paymentMethodId: 'saved-card-public-id',
      items: [{ productId: 1, quantity: 1 }],
      successUrl: 'https://pedido.local/sucesso',
    }),
    (error) =>
      error instanceof OrderRequestError &&
      error.code === 'SAVED_CARD_DISABLED' &&
      /Cartão salvo não está disponível/iu.test(error.message),
  );

  assert.equal(createOrderCalls, 0);
  assert.equal(providerCalls, 0);
});
