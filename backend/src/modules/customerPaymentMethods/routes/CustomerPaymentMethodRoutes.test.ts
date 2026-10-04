import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMercadoPagoCustomerPayload } from './CustomerPaymentMethodRoutes.js';

test('usa o e-mail informado pelo comprador ao criar customer do Mercado Pago', () => {
  const payload = buildMercadoPagoCustomerPayload({
    name: 'Samuel Gomes',
    payerEmail: 'comprador@example.com',
    holderTaxId: '123.456.789-01',
  });

  assert.equal(payload.email, 'comprador@example.com');
  assert.equal(payload.first_name, 'Samuel Gomes');
  assert.deepEqual(payload.identification, {
    type: 'CPF',
    number: '12345678901',
  });
});

test('não substitui o e-mail do comprador por identidade de login', () => {
  const payload = buildMercadoPagoCustomerPayload({
    name: 'Cliente Google',
    payerEmail: 'pagador-cartao@example.com',
    holderTaxId: '12.345.678/0001-95',
  });

  assert.equal(payload.email, 'pagador-cartao@example.com');
  assert.deepEqual(payload.identification, {
    type: 'CNPJ',
    number: '12345678000195',
  });
});
