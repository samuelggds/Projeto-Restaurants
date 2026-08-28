// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import billingRepository from '../repositories/BillingRepository.js';
import processPaymentService from './ProcessPaymentService.js';
import {
  ReconcileMercadoPagoInvoicesService,
  resolveReconciliationMaxInvoices,
  resolveReconciliationTimeoutMs,
} from './ReconcileMercadoPagoInvoicesService.js';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const originalClaimInvoicesForReconciliation = billingRepository.claimInvoicesForReconciliation;
const originalProcessPayment = processPaymentService.execute;
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

let logs: string[] = [];

function reconciliationCandidate(id: number, total = '99.90') {
  return {
    id,
    paymentLink: `https://pay.test/${id}`,
    paymentExternalId: `payment-${id}`,
    total,
    reconciliationAttempts: 1,
  };
}

function approvedPayment(id: number, total = 99.9) {
  return {
    id: `payment-${id}`,
    status: 'approved',
    external_reference: String(id),
    transaction_amount: total,
    currency_id: 'BRL',
    payment_method_id: 'pix',
  };
}

beforeEach(() => {
  Object.assign(process.env, {
    NODE_ENV: 'production',
    PLATFORM_MP_ACCESS_TOKEN: 'test-access-token-that-must-not-leak',
    MP_AUTO_RECONCILE_ENABLED: 'true',
    MP_AUTO_RECONCILE_MAX_INVOICES: '50',
    MP_RECONCILE_TIMEOUT_MS: '15000',
    MP_API_BASE_URL: 'https://api.mercadopago.com',
    ALLOW_UNTRUSTED_OAUTH_ENDPOINTS: 'false',
  });

  logs = [];
  const capture = (...args: unknown[]) => logs.push(args.map(String).join(' '));
  console.log = capture;
  console.warn = capture;
  console.error = capture;
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);

  globalThis.fetch = originalFetch;
  billingRepository.claimInvoicesForReconciliation = originalClaimInvoicesForReconciliation;
  processPaymentService.execute = originalProcessPayment;
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

test('limita lote e timeout mesmo quando a configuração tenta exceder os tetos', () => {
  assert.equal(resolveReconciliationMaxInvoices({ MP_AUTO_RECONCILE_MAX_INVOICES: '9999' }), 200);
  assert.equal(resolveReconciliationMaxInvoices({ MP_AUTO_RECONCILE_MAX_INVOICES: '0' }), 50);
  assert.equal(resolveReconciliationTimeoutMs({ MP_RECONCILE_TIMEOUT_MS: '999999' }), 30_000);
  assert.equal(resolveReconciliationTimeoutMs({ MP_RECONCILE_TIMEOUT_MS: '1' }), 1_000);
  assert.equal(resolveReconciliationTimeoutMs({ MP_RECONCILE_TIMEOUT_MS: 'invalid' }), 15_000);
});

test('consulta apenas endpoint oficial com timeout e redirect bloqueado', async () => {
  const service = new ReconcileMercadoPagoInvoicesService();
  let processedInvoiceId: number | null = null;

  billingRepository.claimInvoicesForReconciliation = async (limit) => {
    assert.equal(limit, 50);
    return [reconciliationCandidate(41)];
  };
  processPaymentService.execute = async ({ invoiceId }) => {
    processedInvoiceId = invoiceId;
    return { id: invoiceId, status: 'PAGO' };
  };
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://api.mercadopago.com');
    assert.equal(url.pathname, '/v1/payments/payment-41');
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal instanceof AbortSignal);
    assert.equal(init?.headers?.Authorization, 'Bearer test-access-token-that-must-not-leak');

    return new Response(JSON.stringify(approvedPayment(41)), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  await service.execute();

  assert.equal(processedInvoiceId, 41);
  assert.equal(logs.join('\n').includes('test-access-token-that-must-not-leak'), false);
});

test('não quita fatura quando identidade, referência, valor, moeda ou método divergem', async () => {
  const service = new ReconcileMercadoPagoInvoicesService();
  const responses = [
    { ...approvedPayment(81), id: 'payment-elsewhere' },
    { ...approvedPayment(81), external_reference: '82' },
    { ...approvedPayment(81), transaction_amount: 9.99 },
    { ...approvedPayment(81), currency_id: 'USD' },
    { ...approvedPayment(81), payment_method_id: 'credit_card' },
  ];
  let processedCount = 0;

  billingRepository.claimInvoicesForReconciliation = async () => [reconciliationCandidate(81)];
  processPaymentService.execute = async () => {
    processedCount += 1;
  };

  for (const responsePayload of responses) {
    globalThis.fetch = async () =>
      new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    await service.execute();
  }

  assert.equal(processedCount, 0);
});

test('continua as próximas faturas e lança AggregateError sanitizado ao final', async () => {
  const service = new ReconcileMercadoPagoInvoicesService();
  const sensitiveFailure = 'provider-payload-with-secret-access-token';
  const processed: number[] = [];
  let fetchCalls = 0;

  billingRepository.claimInvoicesForReconciliation = async () => [
    reconciliationCandidate(51),
    reconciliationCandidate(52),
  ];
  processPaymentService.execute = async ({ invoiceId }) => {
    processed.push(invoiceId);
    return { id: invoiceId, status: 'PAGO' };
  };
  globalThis.fetch = async () => {
    fetchCalls += 1;
    if (fetchCalls === 1) throw new Error(sensitiveFailure);

    return new Response(JSON.stringify(approvedPayment(52)), {
      status: 200,
    });
  };

  await assert.rejects(service.execute(), (failure) => {
    assert.ok(failure instanceof AggregateError);
    assert.match(failure.message, /1 failure/i);
    assert.equal(failure.message.includes(sensitiveFailure), false);
    assert.equal(failure.errors.length, 1);
    assert.equal(failure.errors[0].message, 'Invoice reconciliation failed.');
    return true;
  });

  assert.equal(fetchCalls, 2);
  assert.deepEqual(processed, [52]);
  assert.equal(logs.join('\n').includes(sensitiveFailure), false);
  assert.equal(logs.join('\n').includes('test-access-token-that-must-not-leak'), false);
});

test('recusa resposta acima do limite sem registrar o corpo do provedor', async () => {
  const service = new ReconcileMercadoPagoInvoicesService();
  const sensitivePayload = 'sensitive-provider-response-body';
  let processPaymentCalled = false;

  billingRepository.claimInvoicesForReconciliation = async () => [reconciliationCandidate(61)];
  processPaymentService.execute = async () => {
    processPaymentCalled = true;
  };
  globalThis.fetch = async () =>
    new Response(`${sensitivePayload}${'x'.repeat(256 * 1024)}`, { status: 200 });

  await assert.rejects(service.execute(), AggregateError);

  assert.equal(processPaymentCalled, false);
  assert.equal(logs.join('\n').includes(sensitivePayload), false);
});

test('não lê nem registra payload de resposta HTTP de erro', async () => {
  const service = new ReconcileMercadoPagoInvoicesService();
  const sensitivePayload = 'provider-error-payload-with-token';

  billingRepository.claimInvoicesForReconciliation = async () => [reconciliationCandidate(71)];
  processPaymentService.execute = async () => assert.fail('não deveria processar a fatura');
  globalThis.fetch = async () => new Response(sensitivePayload, { status: 502 });

  await assert.rejects(service.execute(), AggregateError);

  assert.equal(logs.join('\n').includes(sensitivePayload), false);
  assert.equal(logs.join('\n').includes('test-access-token-that-must-not-leak'), false);
});
