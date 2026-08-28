import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessMercadoPagoInvoiceWebhookService } from './ProcessMercadoPagoInvoiceWebhookService.js';

function validPayment() {
  return {
    id: 'payment-41',
    status: 'approved',
    external_reference: '41',
    transaction_amount: 99.9,
    currency_id: 'BRL',
    payment_method_id: 'pix',
  };
}

function serviceFor(payment: unknown, processed: number[]) {
  return new ProcessMercadoPagoInvoiceWebhookService({
    fetchPayment: async (paymentId) => {
      assert.equal(paymentId, 'payment-41');
      return payment;
    },
    findInvoice: async (invoiceId) => ({
      id: invoiceId,
      paymentExternalId: 'payment-41',
      total: '99.90',
    }),
    processPayment: async (invoiceId) => {
      processed.push(invoiceId);
    },
  });
}

test('processa webhook somente depois de consultar e validar o pagamento no provedor', async () => {
  const processed: number[] = [];
  const service = serviceFor({ body: validPayment() }, processed);

  assert.deepEqual(await service.execute('payment-41'), {
    processed: true,
    invoiceId: 41,
  });
  assert.deepEqual(processed, [41]);
});

test('não processa webhook cujo pagamento consultado possui valor divergente', async () => {
  const processed: number[] = [];
  const service = serviceFor({ ...validPayment(), transaction_amount: 9.99 }, processed);

  assert.deepEqual(await service.execute('payment-41'), {
    processed: false,
    invoiceId: 41,
    reason: 'AMOUNT_MISMATCH',
  });
  assert.deepEqual(processed, []);
});
