import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { CARD_PROVIDERS } from '../../payments/providers/providerCatalog.js';
import directOrderCardPaymentService, {
  CardPaymentDeclinedError,
  CardPaymentProviderRequestError,
  mercadoPagoDeclineDetails,
} from './DirectOrderCardPaymentService.js';

const originalFetch = globalThis.fetch;
const originalFindByRestaurantId = restaurantSettingsRepository.findByRestaurantId;
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = 'true';
  process.env.MP_ACCESS_TOKEN = 'TEST-access-token';
  restaurantSettingsRepository.findByRestaurantId = async () =>
    ({
      restaurantId: 7,
      cardGateway: 'MERCADO_PAGO',
      mercadoPagoAccessToken: null,
      mercadoPagoRefreshToken: null,
      mercadoPagoTokenExpiresAt: null,
    }) as never;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  restaurantSettingsRepository.findByRestaurantId = originalFindByRestaurantId;
  for (const name of Object.keys(process.env)) {
    if (!(name in originalEnv)) delete process.env[name];
  }
  Object.assign(process.env, originalEnv);
});

test('checkout transparente Mercado Pago segue o contrato atual sem capture_mode', async () => {
  let requestBody: Record<string, unknown> | null = null;
  let requestHeaders: Headers | null = null;

  globalThis.fetch = async (input, init: RequestInit = {}) => {
    assert.equal(String(input), 'https://api.mercadopago.com/v1/orders');
    assert.equal(init.method, 'POST');
    requestHeaders = new Headers(init.headers);
    requestBody = JSON.parse(String(init.body || '{}')) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: 'ORD_CARD_001',
        status: 'processed',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await directOrderCardPaymentService.execute({
    provider: CARD_PROVIDERS.MERCADO_PAGO,
    payload: {
      cardToken: 'card-token-001',
      cardPaymentMethodId: 'master',
      customerName: 'Cliente Teste',
      payerEmail: 'cliente.real@example.com',
      mercadoPagoDeviceId: 'device-session-901',
    },
    order: {
      id: 901,
      publicId: 'order-public-901',
      restaurantId: 7,
      total: 1,
      systemFee: 4.5,
      restaurant: { name: 'North Pizza' },
    },
    successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
  });

  assert.ok(requestBody);
  assert.ok(requestHeaders);
  assert.equal(requestHeaders.get('x-meli-session-id'), 'device-session-901');
  assert.equal(requestBody.type, 'online');
  assert.equal(requestBody.processing_mode, 'automatic');
  assert.equal(Object.hasOwn(requestBody, 'capture_mode'), false);
  assert.equal(requestBody.total_amount, '1.00');
  assert.equal(requestBody.external_reference, 'ordercard_901_7');
  assert.equal(Object.hasOwn(requestBody, 'marketplace_fee'), false);
  assert.match(String(requestBody.external_reference), /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(requestBody.payer, {
    email: 'cliente.real@example.com',
  });

  const transactions = requestBody.transactions as {
    payments?: Array<{
      amount?: string;
      payment_method?: {
        id?: string;
        type?: string;
        token?: string;
        installments?: number;
      };
    }>;
  };
  assert.equal(transactions.payments?.[0]?.amount, '1.00');
  assert.deepEqual(transactions.payments?.[0]?.payment_method, {
    id: 'master',
    type: 'credit_card',
    token: 'card-token-001',
    installments: 1,
  });
  assert.equal(result.provider, CARD_PROVIDERS.MERCADO_PAGO);
  assert.equal(result.paymentApproved, true);
});

test('cartão salvo Mercado Pago envia payer.customer_id na Orders API', async () => {
  let requestBody: Record<string, unknown> | null = null;

  restaurantSettingsRepository.findByRestaurantId = async () =>
    ({
      restaurantId: 7,
      cardGateway: 'MERCADO_PAGO',
      mercadoPagoAccessToken: 'restaurant-access-token',
      mercadoPagoRefreshToken: 'restaurant-refresh-token',
      mercadoPagoTokenExpiresAt: new Date(Date.now() + 3_600_000),
    }) as never;

  const originalTransaction = prisma.$transaction;
  prisma.$transaction = async (callback: any) =>
    callback({
      $queryRaw: async () => [{ set_config: '7' }],
      customerPaymentMethod: {
        findFirst: async () => ({
          publicId: 'saved-card-public-id',
          userId: 33,
          restaurantId: 7,
          provider: 'MERCADO_PAGO',
          providerCustomerId: 'customer-mp-123',
          brand: 'master',
          active: true,
        }),
      },
    });

  globalThis.fetch = async (_input, init: RequestInit = {}) => {
    requestBody = JSON.parse(String(init.body || '{}')) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        id: 'ORD_CARD_SAVED_001',
        status: 'processed',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  try {
    const result = await directOrderCardPaymentService.execute({
      provider: CARD_PROVIDERS.MERCADO_PAGO,
      payload: {
        userId: 33,
        paymentMethodId: 'saved-card-public-id',
        cardToken: 'saved-card-cvv-token',
        cardPaymentMethodId: 'master',
      },
      order: {
        id: 903,
        publicId: 'order-public-903',
        restaurantId: 7,
        total: 50,
        restaurant: { name: 'North Pizza' },
      },
      successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
    });

    assert.ok(requestBody);
    assert.deepEqual(requestBody.payer, { customer_id: 'customer-mp-123' });
    assert.equal(result.paymentApproved, true);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test('property_value do Mercado Pago não é tratado como cartão recusado', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        message: 'Invalid value for property',
        error: 'bad_request',
        cause: [
          {
            code: 'property_value',
            description: 'Invalid value for property',
          },
        ],
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );

  await assert.rejects(
    () =>
      directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.MERCADO_PAGO,
        payload: {
          cardToken: 'card-token-002',
          cardPaymentMethodId: 'visa',
          customerName: 'Cliente Teste',
        },
        order: {
          id: 902,
          publicId: 'order-public-902',
          restaurantId: 7,
          total: 1,
          systemFee: 0,
          restaurant: { name: 'North Pizza' },
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
      }),
    (error) =>
      error instanceof CardPaymentProviderRequestError &&
      error.providerStatus === 400 &&
      error.providerCode === 'property_value' &&
      error.diagnostic?.provider === 'MERCADO_PAGO' &&
      error.diagnostic.httpStatus === 400 &&
      error.message === 'Não foi possível processar o cartão neste momento.',
  );
});


test('extrai status_detail seguro da recusa Mercado Pago', () => {
  assert.deepEqual(
    mercadoPagoDeclineDetails({
      errors: [{ message: 'The following transactions failed' }],
      data: {
        transactions: {
          payments: [
            {
              status: 'failed',
              status_detail: 'cc_rejected_bad_filled_security_code',
              token: 'nao-deve-ser-logado',
            },
          ],
        },
      },
    }),
    {
      transactionStatus: 'failed',
      transactionStatusDetail: 'cc_rejected_bad_filled_security_code',
    },
  );
});


test('preserva diagnóstico seguro do Mercado Pago em processing_error', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        errors: [{ message: 'The following transactions failed' }],
        data: {
          transactions: {
            payments: [
              {
                status: 'failed',
                status_detail: 'processing_error',
                token: 'card-token-nao-deve-sair',
              },
            ],
          },
        },
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'mp-request-processing-123',
        },
      },
    );

  await assert.rejects(
    () =>
      directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.MERCADO_PAGO,
        payload: {
          cardToken: 'card-token-003',
          cardPaymentMethodId: 'visa',
          payerEmail: 'cliente.real@example.com',
        },
        order: {
          id: 904,
          publicId: 'order-public-904',
          restaurantId: 7,
          total: 49.9,
          restaurant: { name: 'North Pizza' },
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
      }),
    (error) => {
      assert.ok(error instanceof CardPaymentDeclinedError);
      assert.deepEqual(error.diagnostic, {
        provider: 'MERCADO_PAGO',
        httpStatus: 402,
        providerCode: null,
        status: 'failed',
        statusDetail: 'processing_error',
        providerRequestId: 'mp-request-processing-123',
      });
      assert.equal(JSON.stringify(error.diagnostic).includes('card-token'), false);
      return true;
    },
  );
});

test('preserva invalid_card_token sem expor o token recebido', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        errors: [
          {
            message: 'The following transactions failed',
            details: [{ status: 'failed', code: 'invalid_card_token' }],
          },
        ],
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'mp-request-token-456',
        },
      },
    );

  await assert.rejects(
    () =>
      directOrderCardPaymentService.execute({
        provider: CARD_PROVIDERS.MERCADO_PAGO,
        payload: {
          cardToken: 'secret-card-token-004',
          cardPaymentMethodId: 'master',
          payerEmail: 'cliente.real@example.com',
        },
        order: {
          id: 905,
          publicId: 'order-public-905',
          restaurantId: 7,
          total: 59.9,
          restaurant: { name: 'North Pizza' },
        },
        successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
      }),
    (error) => {
      assert.ok(error instanceof CardPaymentDeclinedError);
      assert.equal(error.diagnostic?.statusDetail, 'invalid_card_token');
      assert.equal(error.diagnostic?.providerRequestId, 'mp-request-token-456');
      assert.equal(JSON.stringify(error.diagnostic).includes('secret-card-token-004'), false);
      return true;
    },
  );
});
