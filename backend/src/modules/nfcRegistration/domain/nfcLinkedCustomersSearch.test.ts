import assert from 'node:assert/strict';
import test from 'node:test';
import { linkedNfcCustomerMatches, linkedNfcPaymentState, normalizeLinkedNfcSearch } from './nfcLinkedCustomersSearch.js';

test('pesquisa no servidor por nome, sem diferenciar acentos e maiusculas', () => {
  assert.equal(normalizeLinkedNfcSearch('  JOÃO   da SILVA '), 'joao da silva');
  assert.equal(linkedNfcCustomerMatches('joao', 'João da Silva', '85999999999', false), true);
  assert.equal(linkedNfcCustomerMatches('silva', 'João da Silva', '85999999999', false), true);
  assert.equal(linkedNfcCustomerMatches('maria', 'João da Silva', '85999999999', false), false);
});

test('pesquisa telefone apenas com sequencias suficientes, CPF completo pelo fingerprint', () => {
  assert.equal(linkedNfcCustomerMatches('(85) 99999-9999', 'Ana', '85999999999', false), true);
  assert.equal(linkedNfcCustomerMatches('9999', 'Ana', '85999999999', false), true);
  assert.equal(linkedNfcCustomerMatches('999', 'Ana', '85999999999', false), false);
  assert.equal(linkedNfcCustomerMatches('123.456.789-09', 'Ana', '85999999999', true), true);
  assert.equal(linkedNfcCustomerMatches('123.456.789-09', 'Ana', '85999999999', false), false);
});

test('situacao da comanda nunca pressupoe pagamento apenas por saldo zero', () => {
  assert.equal(linkedNfcPaymentState(null), 'NO_VISIT');
  assert.equal(linkedNfcPaymentState({ status: 'OPEN', totalCents: 0, paidCents: 0 }), 'WAITING_ORDER');
  assert.equal(linkedNfcPaymentState({ status: 'OPEN', totalCents: 6190, paidCents: 6190 }), 'IN_SERVICE');
  assert.equal(linkedNfcPaymentState({ status: 'OPEN', totalCents: 6190, paidCents: 0 }), 'IN_SERVICE');
  assert.equal(linkedNfcPaymentState({ status: 'UNPAID', totalCents: 6190, paidCents: 0 }), 'PENDING');
  assert.equal(linkedNfcPaymentState({ status: 'PAID', totalCents: 6190, paidCents: 6190 }), 'PAID');
  assert.equal(linkedNfcPaymentState({ status: 'PAID', totalCents: 6190, paidCents: 0 }), 'IN_SERVICE');
});
