import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mercadoPagoOpenFinanceExternalReference,
  mercadoPagoOpenFinancePaymentId,
  parseMercadoPagoOpenFinanceExternalReference,
  parseMercadoPagoOpenFinancePaymentId,
} from './mercadoPagoOpenFinanceReference.js';

test('gera referência externa compatível com Orders sem PII ou caracteres inválidos', () => {
  const reference = mercadoPagoOpenFinanceExternalReference(91, 7);
  assert.equal(reference, 'orderopenfinance_7_91');
  assert.match(reference, /^[A-Za-z0-9_-]{1,64}$/);
  assert.deepEqual(parseMercadoPagoOpenFinanceExternalReference(reference), {
    restaurantId: 7,
    orderId: 91,
  });
});

test('separa o id interno do provider order id do Mercado Pago', () => {
  const paymentId = mercadoPagoOpenFinancePaymentId('ORD01ABC');
  assert.equal(paymentId, 'mp_open_finance_order:ORD01ABC');
  assert.equal(parseMercadoPagoOpenFinancePaymentId(paymentId), 'ORD01ABC');
  assert.equal(parseMercadoPagoOpenFinancePaymentId('123456'), '');
});
