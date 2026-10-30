import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { verifyNfcCustomerCpfPrefix, nfcCustomerSessionHash } from './nfcCustomerViewVerification.js';
import { nextNfcReturnCpfFailure } from './nfcReturnCpfLockout.js';

describe('consulta publica read-only NFC', () => {
  it('aceita apenas os primeiros tres digitos corretos do CPF', () => {
    assert.equal(verifyNfcCustomerCpfPrefix('12345678909','123'),true);
    assert.equal(verifyNfcCustomerCpfPrefix('12345678909','124'),false);
    assert.equal(verifyNfcCustomerCpfPrefix('12345678909','12345678909'),false);
    assert.equal(verifyNfcCustomerCpfPrefix('12345678909','12x'),false);
    assert.equal(verifyNfcCustomerCpfPrefix('123','123'),false);
  });
  it('nao reutiliza tokens de sessao de mesas/QR', () => {
    const one=nfcCustomerSessionHash('a'.repeat(43));
    const two=nfcCustomerSessionHash('b'.repeat(43));
    assert.match(one,/^[a-f0-9]{64}$/u);
    assert.notEqual(one,two);
    assert.notEqual(one,'a'.repeat(43));
  });
  it('bloqueia na terceira tentativa por dez minutos e dobra nas seguintes', () => {
    const now=new Date('2026-10-30T15:00:00.000Z');
    assert.equal(nextNfcReturnCpfFailure(0,now).lockedUntil,null);
    assert.equal(nextNfcReturnCpfFailure(1,now).lockedUntil,null);
    assert.equal(nextNfcReturnCpfFailure(2,now).lockedUntil?.getTime(),now.getTime()+10*60_000);
    assert.equal(nextNfcReturnCpfFailure(3,now).lockedUntil?.getTime(),now.getTime()+20*60_000);
  });
});
