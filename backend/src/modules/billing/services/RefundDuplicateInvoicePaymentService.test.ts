// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import refundDuplicateInvoicePaymentService from './RefundDuplicateInvoicePaymentService.js';

const originalFindUnique = prisma.invoicePaymentAttempt.findUnique;
const originalUpdateMany = prisma.invoicePaymentAttempt.updateMany;
const originalFetch = globalThis.fetch;
const originalToken = process.env.PLATFORM_MP_ACCESS_TOKEN;
const originalApiBaseUrl = process.env.MP_API_BASE_URL;
const originalAllowUntrusted = process.env.ALLOW_UNTRUSTED_OAUTH_ENDPOINTS;

afterEach(() => {
  prisma.invoicePaymentAttempt.findUnique = originalFindUnique;
  prisma.invoicePaymentAttempt.updateMany = originalUpdateMany;
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.PLATFORM_MP_ACCESS_TOKEN;
  else process.env.PLATFORM_MP_ACCESS_TOKEN = originalToken;
  if (originalApiBaseUrl === undefined) delete process.env.MP_API_BASE_URL;
  else process.env.MP_API_BASE_URL = originalApiBaseUrl;
  if (originalAllowUntrusted === undefined) delete process.env.ALLOW_UNTRUSTED_OAUTH_ENDPOINTS;
  else process.env.ALLOW_UNTRUSTED_OAUTH_ENDPOINTS = originalAllowUntrusted;
});

function duplicateAttempt(overrides = {}) {
  return {
    id: 301,
    invoiceId: 91,
    restaurantId: 7,
    method: 'PIX',
    provider: 'MERCADO_PAGO',
    providerPaymentId: '987654321',
    status: 'DUPLICATE',
    amount: '99.90',
    ...overrides,
  };
}

test('estorno de liquidação duplicada usa chave idempotente e atualização tenant-scoped', async () => {
  process.env.PLATFORM_MP_ACCESS_TOKEN = 'platform-refund-token-test-only';
  process.env.MP_API_BASE_URL = 'https://api.mercadopago.com';
  process.env.ALLOW_UNTRUSTED_OAUTH_ENDPOINTS = 'false';

  let request = null;
  let update = null;
  prisma.invoicePaymentAttempt.findUnique = async () => duplicateAttempt();
  prisma.invoicePaymentAttempt.updateMany = async (args) => {
    update = args;
    return { count: 1 };
  };
  globalThis.fetch = async (input, init = {}) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify({ id: 'refund-301', status: 'approved' }), {
      status: 201,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await refundDuplicateInvoicePaymentService.execute(301);

  assert.deepEqual(result, { refunded: true, idempotentReplay: false });
  assert.equal(request.url, 'https://api.mercadopago.com/v1/payments/987654321/refunds');
  assert.equal(request.init.method, 'POST');
  assert.equal(
    new Headers(request.init.headers).get('x-idempotency-key'),
    'invoice-duplicate-refund-301',
  );
  assert.deepEqual(update.where, {
    id: 301,
    invoiceId: 91,
    restaurantId: 7,
    status: 'DUPLICATE',
  });
  assert.equal(update.data.status, 'REFUNDED');
  assert.ok(update.data.refundedAt instanceof Date);
});

test('replay de tentativa já estornada não chama Mercado Pago novamente', async () => {
  prisma.invoicePaymentAttempt.findUnique = async () =>
    duplicateAttempt({ status: 'REFUNDED', refundedAt: new Date() });
  prisma.invoicePaymentAttempt.updateMany = async () =>
    assert.fail('não deve atualizar novamente uma tentativa já estornada');
  globalThis.fetch = async () =>
    assert.fail('não deve repetir uma chamada de estorno já confirmada');

  const result = await refundDuplicateInvoicePaymentService.execute(301);

  assert.deepEqual(result, { refunded: true, idempotentReplay: true });
});

test('tentativa de outro estado não pode ser estornada pelo fluxo de duplicidade', async () => {
  prisma.invoicePaymentAttempt.findUnique = async () => duplicateAttempt({ status: 'APPLIED' });
  globalThis.fetch = async () => assert.fail('não deve chamar o provedor');

  await assert.rejects(
    () => refundDuplicateInvoicePaymentService.execute(301),
    /Somente liquidação duplicada/i,
  );
});
