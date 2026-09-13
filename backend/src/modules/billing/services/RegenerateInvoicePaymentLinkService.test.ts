import assert from 'node:assert/strict';
import test from 'node:test';
import regenerateInvoicePaymentLinkService, {
  hasReusablePix,
  pixIdempotencyKey,
} from './RegenerateInvoicePaymentLinkService.js';
import billingRepository from '../repositories/BillingRepository.js';
import mercadoPagoService from './MercadoPagoService.js';

const now = Date.parse('2026-09-12T12:00:00.000Z');

function createInvoice(pixExpiresAt = new Date(now + 5_000)) {
  return {
    id: 42,
    restaurantId: 10,
    restaurant: { email: 'restaurante@example.test' },
    status: 'ATRASADO',
    dueDate: new Date('2020-01-01T12:00:00.000Z'),
    month: 9,
    year: 2026,
    total: 249.9,
    paymentLink: 'https://example.test/pix',
    paymentExternalId: '123',
    pixQrCode: '000201...',
    pixQrCodeBase64: 'base64',
    pixExpiresAt,
  };
}

for (const remainingMs of [5_000, 4_999, 1_000, 1, 0, -1]) {
  test(`respeita a expiração exata com ${remainingMs} ms restantes`, (t) => {
    t.mock.method(Date, 'now', () => now);
    assert.equal(hasReusablePix(createInvoice(new Date(now + remainingMs))), remainingMs > 0);
  });
}

test('não reutiliza Pix sem uma data de expiração válida', () => {
  for (const pixExpiresAt of [undefined, null, new Date('invalid')]) {
    assert.equal(hasReusablePix({ ...createInvoice(), pixExpiresAt }), false);
  }
});

test('pedidos repetidos preservam o Pix e só geram outro após expirar', async (t) => {
  let currentTime = now;
  let invoice = createInvoice();
  const originalInvoice = invoice;
  t.mock.method(Date, 'now', () => currentTime);
  const findInvoice = t.mock.method(
    billingRepository,
    'findInvoiceByIdAndRestaurantId',
    async () => invoice,
  );
  const payment = {
    id: '456',
    status: 'pending',
    qrCode: 'novo-codigo-pix',
    qrCodeBase64: 'novo-base64',
    ticketUrl: 'https://example.test/novo-pix',
    expiresAt: new Date(now + 5_000 + 30 * 60 * 1_000).toISOString(),
  };
  const createPayment = t.mock.method(mercadoPagoService, 'createPayment', async () => payment);
  const updateInvoice = t.mock.method(
    billingRepository,
    'updateInvoicePaymentDetailsAndResetReconciliation',
    async () => {
      invoice = {
        ...invoice,
        paymentExternalId: payment.id,
        paymentLink: payment.ticketUrl,
        pixQrCode: payment.qrCode,
        pixQrCodeBase64: payment.qrCodeBase64,
        pixExpiresAt: new Date(payment.expiresAt),
      };
      return invoice;
    },
  );
  const request = { invoiceId: invoice.id, restaurantId: invoice.restaurantId };

  for (const elapsedMs of [0, 1, 4_000, 4_999]) {
    currentTime = now + elapsedMs;
    const result = await regenerateInvoicePaymentLinkService.execute(request);
    assert.deepEqual(result, {
      invoice: originalInvoice,
      paymentLink: originalInvoice.paymentLink,
      pixQrCode: originalInvoice.pixQrCode,
      pixQrCodeBase64: originalInvoice.pixQrCodeBase64,
      pixExpiresAt: originalInvoice.pixExpiresAt.toISOString(),
      reused: true,
    });
    assert.equal(createPayment.mock.callCount(), 0);
    assert.equal(updateInvoice.mock.callCount(), 0);
  }

  currentTime = now + 5_000;
  const renewed = await regenerateInvoicePaymentLinkService.execute(request);
  assert.equal(renewed.reused, false);
  assert.equal(renewed.pixQrCode, payment.qrCode);
  assert.equal(renewed.pixQrCodeBase64, payment.qrCodeBase64);
  assert.equal(renewed.pixExpiresAt, payment.expiresAt);
  assert.equal(createPayment.mock.callCount(), 1);
  assert.equal(updateInvoice.mock.callCount(), 1);
  assert.deepEqual(createPayment.mock.calls[0].arguments, [
    {
      invoiceId: originalInvoice.id,
      title: `Mensalidade restaurante ${originalInvoice.restaurantId}`,
      description: 'Fatura 9/2026',
      amount: originalInvoice.total,
      payerEmail: originalInvoice.restaurant.email,
      idempotencyKey: 'invoice-pix-42-123',
    },
  ]);
  assert.deepEqual(updateInvoice.mock.calls[0].arguments, [
    originalInvoice.id,
    originalInvoice.restaurantId,
    {
      paymentLink: payment.ticketUrl,
      paymentExternalId: payment.id,
      pixQrCode: payment.qrCode,
      pixQrCodeBase64: payment.qrCodeBase64,
      pixExpiresAt: new Date(payment.expiresAt),
    },
  ]);

  currentTime += 1;
  const reopened = await regenerateInvoicePaymentLinkService.execute(request);
  assert.deepEqual(reopened, { ...renewed, reused: true });
  assert.equal(createPayment.mock.callCount(), 1);
  assert.equal(updateInvoice.mock.callCount(), 1);
  for (const call of findInvoice.mock.calls) {
    assert.deepEqual(call.arguments, [originalInvoice.id, originalInvoice.restaurantId]);
  }
});

test('reutiliza Pix enquanto a cobrança ainda está válida', () => {
  assert.equal(
    hasReusablePix({
      paymentLink: 'https://example.test/pix',
      paymentExternalId: '123',
      pixQrCode: '000201...',
      pixQrCodeBase64: 'base64',
      pixExpiresAt: new Date(Date.now() + 60_000),
    }),
    true,
  );
});

test('não reutiliza Pix expirado ou incompleto', () => {
  assert.equal(
    hasReusablePix({
      paymentExternalId: '123',
      pixQrCode: '000201...',
      pixQrCodeBase64: 'base64',
      pixExpiresAt: new Date(Date.now() - 1_000),
    }),
    false,
  );
  assert.equal(
    hasReusablePix({
      paymentExternalId: '123',
      pixQrCode: null,
      pixQrCodeBase64: null,
      pixExpiresAt: new Date(Date.now() + 60_000),
    }),
    false,
  );
});

test('usa a mesma chave para regenerações concorrentes da mesma geração', () => {
  assert.equal(
    pixIdempotencyKey({ id: 42, paymentExternalId: 'mp-old-123' }),
    'invoice-pix-42-mp-old-123',
  );
  assert.equal(pixIdempotencyKey({ id: 42, paymentExternalId: null }), 'invoice-pix-42-initial');
});
