import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canReuseRevokedNfcCard } from './nfcRevokedCardReusePolicy.js';
describe('NFC: liberar cartão físico revogado para novo cliente', () => {
  const customerId='8a67c472-3140-4c9d-bb72-af56d2182079';
  it('somente um cartão revogado com todas as comandas PAID e saldo zero', () => {
    assert.equal(canReuseRevokedNfcCard('REVOKED', customerId, [{status:'PAID',totalCents:15000n,paidCents:15000n}]),true);
    assert.equal(canReuseRevokedNfcCard('REVOKED', customerId, [{status:'PAID',totalCents:15000n,paidCents:14999n}]),false);
    assert.equal(canReuseRevokedNfcCard('REVOKED', customerId, [
      {status:'PAID',totalCents:15000n,paidCents:15000n},
      {status:'UNPAID',totalCents:100n,paidCents:0n},
    ]),false);
    assert.equal(canReuseRevokedNfcCard('REVOKED', customerId, [{status:'OPEN',totalCents:0n,paidCents:0n}]),false);
  });
  it('não libera cartão ativo ou já desvinculado; histórico totalmente pago é permitido', () => {
    assert.equal(canReuseRevokedNfcCard('ACTIVE',customerId,[]),false);
    assert.equal(canReuseRevokedNfcCard('REVOKED',null,[]),false);
    assert.equal(canReuseRevokedNfcCard('REVOKED',customerId,[]),true);
    assert.equal(canReuseRevokedNfcCard('REVOKED',customerId,[
      {status:'PAID',totalCents:500n,paidCents:500n},
      {status:'PAID',totalCents:400n,paidCents:400n},
    ]),true);
  });
});
