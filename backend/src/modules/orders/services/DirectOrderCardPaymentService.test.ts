import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { CARD_PROVIDERS } from '../../payments/providers/providerCatalog.js';
import directOrderCardPaymentService, {
  CardPaymentProviderRequestError,
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

  globalThis.fetch = async (input, init: RequestInit = {}) => {
    assert.equal(String(input), 'https://api.mercadopago.com/v1/orders');
    assert.equal(init.method, 'POST');
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
    },
    order: {
      id: 901,
      publicId: 'order-public-901',
      restaurantId: 7,
      total: 1,
      systemFee: 0,
      restaurant: { name: 'North Pizza' },
    },
    successUrlBase: 'https://www.gastronexa.com.br/north-pizza',
  });

  assert.ok(requestBody);
  assert.equal(requestBody.type, 'online');
  assert.equal(requestBody.processing_mode, 'automatic');
  assert.equal(Object.hasOwn(requestBody, 'capture_mode'), false);
  assert.equal(requestBody.total_amount, '1.00');
  assert.equal(requestBody.external_reference, 'ordercard_901_7');
  assert.match(String(requestBody.external_reference), /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(requestBody.payer, {
    email: 'guest.card.7.901@gastronexa.local',
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
      error.message === 'Não foi possível processar o cartão neste momento.',
  );
});
