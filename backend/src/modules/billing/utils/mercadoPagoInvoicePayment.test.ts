import assert from 'node:assert/strict';
import test from 'node:test';
import { validateMercadoPagoInvoicePayment } from './mercadoPagoInvoicePayment.js';

const invoice = {
  id: 41,
  paymentExternalId: 'payment-41',
  total: '99.90',
};

const payment = {
  id: 'payment-41',
  status: 'approved',
  external_reference: '41',
  transaction_amount: 99.9,
  currency_id: 'BRL',
  payment_method_id: 'pix',
};

test('aceita somente pagamento Pix aprovado que corresponde integralmente à fatura', () => {
  assert.deepEqual(validateMercadoPagoInvoicePayment(invoice, payment), { valid: true });
});

test('recusa divergência de identidade, referência, valor, moeda, método ou status', () => {
  const cases = [
    [{ ...payment, id: 'payment-42' }, 'PAYMENT_ID_MISMATCH'],
    [{ ...payment, external_reference: '42' }, 'EXTERNAL_REFERENCE_MISMATCH'],
    [{ ...payment, transaction_amount: 9.99 }, 'AMOUNT_MISMATCH'],
    [{ ...payment, currency_id: 'USD' }, 'CURRENCY_MISMATCH'],
    [{ ...payment, payment_method_id: 'credit_card' }, 'PAYMENT_METHOD_MISMATCH'],
    [{ ...payment, status: 'pending' }, 'PAYMENT_NOT_APPROVED'],
  ] as const;

  for (const [receivedPayment, reason] of cases) {
    assert.deepEqual(validateMercadoPagoInvoicePayment(invoice, receivedPayment), {
      valid: false,
      reason,
    });
  }
});

test('recusa fatura sem o identificador externo persistido', () => {
  assert.deepEqual(
    validateMercadoPagoInvoicePayment({ ...invoice, paymentExternalId: null }, payment),
    { valid: false, reason: 'INVALID_EXPECTED_INVOICE' },
  );
});
