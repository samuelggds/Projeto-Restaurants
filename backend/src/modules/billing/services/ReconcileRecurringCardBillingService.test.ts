// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import billingRepository from '../repositories/BillingRepository.js';
import platformPlanCatalogService from './PlatformPlanCatalogService.js';
import processPaymentService from './ProcessPaymentService.js';
import refundDuplicateInvoicePaymentService from './RefundDuplicateInvoicePaymentService.js';
import { ReconcileRecurringCardBillingService } from './ReconcileRecurringCardBillingService.js';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const originalQueryRaw = prisma.$queryRaw;
const originalExecuteRaw = prisma.$executeRaw;
const originalFindInvoice = prisma.invoice.findFirst;
const originalFindSubscription = billingRepository.findSubscriptionByRestaurantId;
const originalGetPlan = platformPlanCatalogService.getByCode;
const originalProcessPaymentTracked = processPaymentService.executeTracked;
const originalRegisterAttempt = billingRepository.registerInvoicePaymentAttempt;
const originalRefundDuplicate = refundDuplicateInvoicePaymentService.execute;

beforeEach(() => {
  Object.assign(process.env, {
    NODE_ENV: 'production',
    PLATFORM_MP_ACCESS_TOKEN: 'platform-access-token-test-only',
    MP_API_BASE_URL: 'https://api.mercadopago.com',
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
  prisma.invoice.findFirst = originalFindInvoice;
  billingRepository.findSubscriptionByRestaurantId = originalFindSubscription;
  platformPlanCatalogService.getByCode = originalGetPlan;
  processPaymentService.executeTracked = originalProcessPaymentTracked;
  billingRepository.registerInvoicePaymentAttempt = originalRegisterAttempt;
  refundDuplicateInvoicePaymentService.execute = originalRefundDuplicate;
});

function installBaseDependencies({ invoiceTotal = '249.90' } = {}) {
  prisma.$queryRaw = async () => [
    {
      restaurantId: 7,
      providerSubscriptionId: 'preapproval-7',
      lastPaymentId: null,
    },
  ];
  prisma.$executeRaw = async () => 1;
  billingRepository.findSubscriptionByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return {
      plan: 'PREMIUM',
      scheduledPlan: null,
      scheduledPlanEffectiveMonth: null,
      scheduledPlanEffectiveYear: null,
    };
  };
  platformPlanCatalogService.getByCode = async () => ({ monthlyFee: 249.9 });
  prisma.invoice.findFirst = async ({ where }) => {
    assert.equal(where.restaurantId, 7);
    assert.deepEqual(where.status, { not: 'CANCELADO' });
    return {
      id: 91,
      restaurantId: 7,
      total: { toString: () => invoiceTotal },
      status: 'PENDENTE',
      dueDate: new Date('2026-11-15T12:00:00.000Z'),
    };
  };
  billingRepository.registerInvoicePaymentAttempt = async (input) => ({
    id: 191,
    invoiceId: input.invoiceId,
    restaurantId: input.restaurantId,
    method: input.method,
    provider: input.provider,
    providerPaymentId: input.providerPaymentId,
    amount: input.amount,
    status: 'PENDING',
  });
  refundDuplicateInvoicePaymentService.execute = async () => ({ refunded: true });
}

test('concilia cobrança recorrente aprovada e quita somente a fatura do mesmo restaurante', async () => {
  const service = new ReconcileRecurringCardBillingService();
  installBaseDependencies();
  const processed = [];
  const providerCalls = [];

  processPaymentService.executeTracked = async ({ invoiceId, paymentAttemptId }) => {
    processed.push({ invoiceId, paymentAttemptId });
    return { invoice: { id: invoiceId, status: 'PAGO' }, settlement: 'APPLIED' };
  };

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    providerCalls.push({ url, init });
    assert.equal(url.origin, 'https://api.mercadopago.com');
    assert.equal(init?.redirect, 'error');
    assert.equal(init?.headers?.Authorization, 'Bearer platform-access-token-test-only');

    if (url.pathname === '/preapproval/preapproval-7') {
      return new Response(
        JSON.stringify({
          id: 'preapproval-7',
          status: 'authorized',
          next_payment_date: '2026-11-15T12:00:00.000Z',
          auto_recurring: { transaction_amount: 249.9, currency_id: 'BRL' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    assert.equal(url.pathname, '/authorized_payments/search');
    assert.equal(url.searchParams.get('preapproval_id'), 'preapproval-7');
    return new Response(
      JSON.stringify({
        results: [
          {
            transaction_amount: '249.90',
            currency_id: 'BRL',
            debit_date: '2026-11-15T12:00:00.000Z',
            payment: { id: 880091, status: 'approved', status_detail: 'accredited' },
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const result = await service.execute();

  assert.deepEqual(result, { processed: 1, paid: 1, failures: 0 });
  assert.deepEqual(processed, [{ invoiceId: 91, paymentAttemptId: 191 }]);
  assert.equal(providerCalls.length, 2);
});

test('não quita mensalidade se o valor recorrente aprovado divergir da fatura', async () => {
  const service = new ReconcileRecurringCardBillingService();
  installBaseDependencies({ invoiceTotal: '249.90' });
  let processed = false;

  processPaymentService.executeTracked = async ({ invoiceId }) => {
    processed = true;
    return { invoice: { id: invoiceId, status: 'PAGO' }, settlement: 'APPLIED' };
  };
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.startsWith('/preapproval/')) {
      return new Response(
        JSON.stringify({
          status: 'authorized',
          next_payment_date: '2026-11-15T12:00:00.000Z',
          auto_recurring: { transaction_amount: 249.9, currency_id: 'BRL' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(
      JSON.stringify({
        results: [
          {
            transaction_amount: '9.90',
            currency_id: 'BRL',
            debit_date: '2026-11-15T12:00:00.000Z',
            payment: { id: 880092, status: 'approved', status_detail: 'accredited' },
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const result = await service.execute();

  assert.equal(processed, false);
  assert.deepEqual(result, { processed: 1, paid: 0, failures: 0 });
});

test('cartão aprovado após Pix já pago é registrado e estornado como duplicidade', async () => {
  const service = new ReconcileRecurringCardBillingService();
  installBaseDependencies();
  const refunded: number[] = [];
  const attempts = [];

  prisma.invoice.findFirst = async ({ where }) => {
    assert.equal(where.restaurantId, 7);
    assert.deepEqual(where.status, { not: 'CANCELADO' });
    return {
      id: 91,
      restaurantId: 7,
      total: { toString: () => '249.90' },
      status: 'PAGO',
      dueDate: new Date('2026-11-15T12:00:00.000Z'),
    };
  };
  billingRepository.registerInvoicePaymentAttempt = async (input) => {
    attempts.push(input);
    return { id: 291, ...input, status: 'PENDING' };
  };
  processPaymentService.executeTracked = async ({ invoiceId, paymentAttemptId }) => {
    assert.equal(invoiceId, 91);
    assert.equal(paymentAttemptId, 291);
    return { invoice: { id: 91, status: 'PAGO' }, settlement: 'DUPLICATE' };
  };
  refundDuplicateInvoicePaymentService.execute = async (attemptId) => {
    refunded.push(Number(attemptId));
    return { refunded: true };
  };

  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/preapproval/preapproval-7') {
      return new Response(
        JSON.stringify({
          id: 'preapproval-7',
          status: 'authorized',
          next_payment_date: '2026-11-15T12:00:00.000Z',
          auto_recurring: { transaction_amount: 249.9, currency_id: 'BRL' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response(
      JSON.stringify({
        results: [
          {
            transaction_amount: '249.90',
            currency_id: 'BRL',
            debit_date: '2026-11-15T12:00:00.000Z',
            payment: { id: 880093, status: 'approved', status_detail: 'accredited' },
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const result = await service.execute();

  assert.deepEqual(result, { processed: 1, paid: 0, failures: 0 });
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].method, 'CARD');
  assert.equal(attempts[0].providerPaymentId, '880093');
  assert.deepEqual(refunded, [291]);
});

test('sincroniza valor da assinatura no Mercado Pago antes do próximo ciclo quando o plano mudou', async () => {
  const service = new ReconcileRecurringCardBillingService();
  installBaseDependencies();
  billingRepository.findSubscriptionByRestaurantId = async () => ({
    plan: 'BASICO',
    scheduledPlan: 'PREMIUM',
    scheduledPlanEffectiveMonth: 11,
    scheduledPlanEffectiveYear: 2026,
  });
  platformPlanCatalogService.getByCode = async (plan) => {
    assert.equal(plan, 'PREMIUM');
    return { monthlyFee: 249.9 };
  };
  processPaymentService.executeTracked = async ({ invoiceId }) => ({
    invoice: { id: invoiceId, status: 'PAGO' },
    settlement: 'APPLIED',
  });
  const requests = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    requests.push({ url, init });

    if (url.pathname === '/preapproval/preapproval-7' && init?.method === 'PUT') {
      assert.deepEqual(JSON.parse(String(init.body)), {
        auto_recurring: { transaction_amount: 249.9, currency_id: 'BRL' },
      });
      return new Response(JSON.stringify({ status: 'authorized' }), { status: 200 });
    }

    if (url.pathname === '/preapproval/preapproval-7') {
      return new Response(
        JSON.stringify({
          status: 'authorized',
          next_payment_date: '2026-11-15T12:00:00.000Z',
          auto_recurring: { transaction_amount: 149.9, currency_id: 'BRL' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await service.execute();

  assert.deepEqual(result, { processed: 1, paid: 0, failures: 0 });
  assert.equal(
    requests.some(
      ({ url, init }) =>
        url.pathname === '/preapproval/preapproval-7' && init?.method === 'PUT',
    ),
    true,
  );
});

test('sem token dedicado em produção não consulta provedor nem processa cobrança', async () => {
  const service = new ReconcileRecurringCardBillingService();
  delete process.env.PLATFORM_MP_ACCESS_TOKEN;
  process.env.MP_ACCESS_TOKEN = 'token-legado-nao-permitido-em-producao';

  let queried = false;
  let fetched = false;
  let processed = false;
  prisma.$queryRaw = async () => {
    queried = true;
    return [];
  };
  globalThis.fetch = async () => {
    fetched = true;
    throw new Error('não deve chamar o provedor');
  };
  processPaymentService.executeTracked = async ({ invoiceId }) => {
    processed = true;
    return { invoice: { id: invoiceId, status: 'PAGO' }, settlement: 'APPLIED' };
  };

  const result = await service.execute();

  assert.deepEqual(result, { processed: 0, paid: 0, failures: 0 });
  assert.equal(queried, false);
  assert.equal(fetched, false);
  assert.equal(processed, false);
});
