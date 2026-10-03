// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import billingRepository from '../repositories/BillingRepository.js';
import platformPlanCatalogService from './PlatformPlanCatalogService.js';
import { PlatformRecurringBillingService } from './PlatformRecurringBillingService.js';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const originalQueryRaw = prisma.$queryRaw;
const originalExecuteRaw = prisma.$executeRaw;
const originalFindSubscription = billingRepository.findSubscriptionByRestaurantId;
const originalGetPlan = platformPlanCatalogService.getByCode;

beforeEach(() => {
  Object.assign(process.env, {
    NODE_ENV: 'production',
    PLATFORM_MP_ACCESS_TOKEN: 'platform-access-token-test-only',
    MP_PUBLIC_KEY: 'APP_USR-public-key-test-only',
    MP_API_BASE_URL: 'https://api.mercadopago.com',
    FRONTEND_URL: 'https://www.gastronexa.test',
    ALLOW_UNTRUSTED_OAUTH_ENDPOINTS: 'false',
  });
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
  globalThis.fetch = originalFetch;
  prisma.$queryRaw = originalQueryRaw;
  prisma.$executeRaw = originalExecuteRaw;
  billingRepository.findSubscriptionByRestaurantId = originalFindSubscription;
  platformPlanCatalogService.getByCode = originalGetPlan;
});

function profile(overrides = {}) {
  return {
    restaurantId: 7,
    billingMethod: 'CARD',
    autoRenew: true,
    provider: 'MERCADO_PAGO',
    providerSubscriptionId: 'preapproval-7',
    providerCustomerId: 'payer-7',
    cardBrand: 'visa',
    cardLast4: '4242',
    cardExpMonth: 12,
    cardExpYear: 2035,
    status: 'AUTHORIZED',
    nextBillingAt: new Date('2026-11-15T12:00:00.000Z'),
    lastChargeAt: null,
    lastPaymentId: null,
    lastFailureAt: null,
    lastFailureReason: null,
    ...overrides,
  };
}

test('configuração pública expõe somente a Public Key do Mercado Pago', () => {
  const service = new PlatformRecurringBillingService();
  const config = service.getPublicConfig();

  assert.deepEqual(config, {
    provider: 'MERCADO_PAGO',
    publicKey: 'APP_USR-public-key-test-only',
  });
  assert.equal(JSON.stringify(config).includes('platform-access-token-test-only'), false);
});

test('cria assinatura recorrente mensal no endpoint oficial sem receber PAN ou CVV', async () => {
  const service = new PlatformRecurringBillingService();
  const queries = [[], [profile()]];
  let executeCount = 0;
  let providerRequest = null;

  prisma.$queryRaw = async () => queries.shift() || [];
  prisma.$executeRaw = async () => {
    executeCount += 1;
    return 1;
  };
  billingRepository.findSubscriptionByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return {
      id: 3,
      plan: 'PREMIUM',
      status: 'ATIVA',
      currentPeriodEnd: new Date('2026-11-15T12:00:00.000Z'),
      trialEndsAt: null,
      restaurant: {
        name: 'Restaurante Teste',
        email: 'financeiro@example.test',
      },
    };
  };
  platformPlanCatalogService.getByCode = async (plan, options) => {
    assert.equal(plan, 'PREMIUM');
    assert.deepEqual(options, { activeOnly: false });
    return { code: 'PREMIUM', monthlyFee: 199.9 };
  };
  globalThis.fetch = async (input, init) => {
    providerRequest = { input: String(input), init };
    return new Response(
      JSON.stringify({
        id: 'preapproval-7',
        status: 'authorized',
        payer_id: 9007,
        payment_method_id: 'visa',
        next_payment_date: '2026-11-15T12:00:00.000Z',
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    );
  };

  const result = await service.enableCard({
    restaurantId: 7,
    cardToken: 'provider-card-token-7',
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2035,
  });

  assert.equal(providerRequest.input, 'https://api.mercadopago.com/preapproval');
  assert.equal(providerRequest.init?.method, 'POST');
  assert.equal(
    providerRequest.init?.headers?.Authorization,
    'Bearer platform-access-token-test-only',
  );
  assert.equal(
    providerRequest.init?.headers?.['X-Idempotency-Key'],
    'platform-recurring-7',
  );

  const body = JSON.parse(String(providerRequest.init?.body));
  assert.deepEqual(body.auto_recurring, {
    frequency: 1,
    frequency_type: 'months',
    start_date: '2026-11-15T12:00:00.000Z',
    transaction_amount: 199.9,
    currency_id: 'BRL',
  });
  assert.equal(body.card_token_id, 'provider-card-token-7');
  assert.equal(body.external_reference, 'platform-subscription:7');
  assert.equal(body.payer_email, 'financeiro@example.test');
  assert.equal(body.back_url, 'https://www.gastronexa.test');
  assert.equal(body.status, 'authorized');
  assert.equal('card_number' in body, false);
  assert.equal('security_code' in body, false);
  assert.equal(executeCount, 1);
  assert.equal(result.billingMethod, 'CARD');
  assert.equal(result.autoRenew, true);
  assert.equal(result.providerSubscriptionId, 'preapproval-7');
});

test('produção recusa ativar recorrência quando FRONTEND_URL não usa HTTPS', async () => {
  const service = new PlatformRecurringBillingService();
  process.env.FRONTEND_URL = 'http://inseguro.example.test';

  prisma.$queryRaw = async () => [];
  billingRepository.findSubscriptionByRestaurantId = async () => ({
    id: 3,
    plan: 'PREMIUM',
    status: 'ATIVA',
    currentPeriodEnd: new Date('2026-11-15T12:00:00.000Z'),
    trialEndsAt: null,
    restaurant: { name: 'Restaurante Teste', email: 'financeiro@example.test' },
  });
  platformPlanCatalogService.getByCode = async () => ({ monthlyFee: 199.9 });
  globalThis.fetch = async () => assert.fail('não deve chamar o Mercado Pago');

  await assert.rejects(
    () =>
      service.enableCard({
        restaurantId: 7,
        cardToken: 'provider-card-token-7',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2035,
      }),
    /FRONTEND_URL HTTPS/,
  );
});

test('ao voltar para Pix pausa a assinatura recorrente existente', async () => {
  const service = new PlatformRecurringBillingService();
  const queries = [[profile()], [profile({ billingMethod: 'PIX', autoRenew: false, status: 'PAUSED' })]];
  let updateCount = 0;
  let providerRequest = null;

  prisma.$queryRaw = async () => queries.shift() || [];
  prisma.$executeRaw = async () => {
    updateCount += 1;
    return 1;
  };
  globalThis.fetch = async (input, init) => {
    providerRequest = { input: String(input), init };
    return new Response(
      JSON.stringify({ id: 'preapproval-7', status: 'paused' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const result = await service.usePix(7);

  assert.equal(providerRequest.input, 'https://api.mercadopago.com/preapproval/preapproval-7');
  assert.equal(providerRequest.init?.method, 'PUT');
  assert.deepEqual(JSON.parse(String(providerRequest.init?.body)), { status: 'paused' });
  assert.equal(updateCount, 1);
  assert.equal(result.billingMethod, 'PIX');
  assert.equal(result.autoRenew, false);
  assert.equal(result.status, 'PAUSED');
});


test('cancelamento da assinatura encerra a recorrência no Mercado Pago antes do estado local', async () => {
  const service = new PlatformRecurringBillingService();
  const queries = [
    [profile()],
    [profile({ autoRenew: false, status: 'CANCELED', nextBillingAt: null })],
  ];
  let updateCount = 0;
  let providerRequest = null;

  prisma.$queryRaw = async () => queries.shift() || [];
  prisma.$executeRaw = async () => {
    updateCount += 1;
    return 1;
  };
  globalThis.fetch = async (input, init) => {
    providerRequest = { input: String(input), init };
    return new Response(JSON.stringify({ id: 'preapproval-7', status: 'canceled' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await service.cancelRecurringBilling(7);

  assert.equal(providerRequest.input, 'https://api.mercadopago.com/preapproval/preapproval-7');
  assert.equal(providerRequest.init?.method, 'PUT');
  assert.deepEqual(JSON.parse(String(providerRequest.init?.body)), { status: 'canceled' });
  assert.equal(updateCount, 1);
  assert.equal(result.autoRenew, false);
  assert.equal(result.status, 'CANCELED');
  assert.equal(result.nextBillingAt, null);
});

test('retry de cancelamento já confirmado não chama novamente o provedor', async () => {
  const service = new PlatformRecurringBillingService();
  const canceled = profile({
    autoRenew: false,
    status: 'CANCELED',
    nextBillingAt: null,
  });
  const queries = [[canceled], [canceled]];
  let updateCount = 0;

  prisma.$queryRaw = async () => queries.shift() || [];
  prisma.$executeRaw = async () => {
    updateCount += 1;
    return 1;
  };
  globalThis.fetch = async () => assert.fail('não deve chamar o Mercado Pago novamente');

  const result = await service.cancelRecurringBilling(7);

  assert.equal(updateCount, 1);
  assert.equal(result.status, 'CANCELED');
  assert.equal(result.autoRenew, false);
});
