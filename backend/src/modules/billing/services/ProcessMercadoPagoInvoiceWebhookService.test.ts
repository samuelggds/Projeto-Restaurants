import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessMercadoPagoInvoiceWebhookService } from './ProcessMercadoPagoInvoiceWebhookService.js';

function validPayment(id = 'payment-41') {
  return {
    id,
    status: 'approved',
    external_reference: '41',
    transaction_amount: 99.9,
    currency_id: 'BRL',
    payment_method_id: 'pix',
  };
}

function serviceFor(
  payment: unknown,
  processed: Array<{ invoiceId: number; paymentAttemptId: number }>,
  options: {
    currentPaymentId?: string;
    attemptPaymentId?: string;
    settlement?: 'APPLIED' | 'IDEMPOTENT' | 'DUPLICATE' | 'REFUNDED';
    refunded?: number[];
  } = {},
) {
  const attemptPaymentId = options.attemptPaymentId || 'payment-41';
  return new ProcessMercadoPagoInvoiceWebhookService({
    fetchPayment: async (paymentId) => {
      assert.equal(paymentId, attemptPaymentId);
      return payment;
    },
    findInvoice: async (invoiceId) => ({
      id: invoiceId,
      restaurantId: 7,
      paymentExternalId: options.currentPaymentId || 'payment-41',
      total: '99.90',
    }),
    findAttempt: async (paymentId) => ({
      id: 71,
      invoiceId: 41,
      restaurantId: 7,
      providerPaymentId: paymentId,
      amount: '99.90',
      status: 'PENDING',
    }),
    registerAttempt: async () => assert.fail('tentativa já deveria existir'),
    processPayment: async (invoiceId, paymentAttemptId) => {
      processed.push({ invoiceId, paymentAttemptId });
      return { settlement: options.settlement || 'APPLIED' };
    },
    refundDuplicate: async (paymentAttemptId) => {
      options.refunded?.push(paymentAttemptId);
      return { refunded: true };
    },
  });
}

test('processa webhook somente depois de consultar e validar a tentativa no provedor', async () => {
  const processed: Array<{ invoiceId: number; paymentAttemptId: number }> = [];
  const service = serviceFor({ body: validPayment() }, processed);

  assert.deepEqual(await service.execute('payment-41'), {
    processed: true,
    invoiceId: 41,
  });
  assert.deepEqual(processed, [{ invoiceId: 41, paymentAttemptId: 71 }]);
});

test('webhook atrasado de Pix anterior continua válido após regenerar a cobrança', async () => {
  const processed: Array<{ invoiceId: number; paymentAttemptId: number }> = [];
  const service = serviceFor(validPayment('payment-old'), processed, {
    currentPaymentId: 'payment-new',
    attemptPaymentId: 'payment-old',
  });

  assert.deepEqual(await service.execute('payment-old'), {
    processed: true,
    invoiceId: 41,
  });
  assert.deepEqual(processed, [{ invoiceId: 41, paymentAttemptId: 71 }]);
});

test('segunda liquidação da fatura é estornada em vez de ser ignorada', async () => {
  const processed: Array<{ invoiceId: number; paymentAttemptId: number }> = [];
  const refunded: number[] = [];
  const service = serviceFor(validPayment(), processed, {
    settlement: 'DUPLICATE',
    refunded,
  });

  assert.deepEqual(await service.execute('payment-41'), {
    processed: true,
    invoiceId: 41,
    duplicateRefunded: true,
  });
  assert.deepEqual(refunded, [71]);
});

test('não processa webhook cujo pagamento consultado possui valor divergente', async () => {
  const processed: Array<{ invoiceId: number; paymentAttemptId: number }> = [];
  const service = serviceFor({ ...validPayment(), transaction_amount: 9.99 }, processed);

  assert.deepEqual(await service.execute('payment-41'), {
    processed: false,
    invoiceId: 41,
    reason: 'AMOUNT_MISMATCH',
  });
  assert.deepEqual(processed, []);
});

test('não aceita pagamento sem tentativa conhecida quando não é o ponteiro legado atual', async () => {
  const service = new ProcessMercadoPagoInvoiceWebhookService({
    fetchPayment: async () => validPayment('payment-unknown'),
    findInvoice: async () => ({
      id: 41,
      restaurantId: 7,
      paymentExternalId: 'payment-current',
      total: '99.90',
    }),
    findAttempt: async () => null,
    registerAttempt: async () => assert.fail('não deve registrar ID desconhecido'),
    processPayment: async () => assert.fail('não deve quitar a fatura'),
    refundDuplicate: async () => assert.fail('não deve estornar'),
  });

  assert.deepEqual(await service.execute('payment-unknown'), {
    processed: false,
    invoiceId: 41,
    reason: 'PAYMENT_ATTEMPT_NOT_FOUND',
  });
});
