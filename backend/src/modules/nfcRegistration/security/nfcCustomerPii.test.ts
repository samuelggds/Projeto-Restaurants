import assert from 'node:assert/strict';
import test from 'node:test';
import { encryptNfcPii, decryptNfcPii, maskNfcCpf, maskNfcPhone, nfcCpfFingerprints } from './nfcCustomerPii.js';

const original = process.env.CREDENTIAL_ENCRYPTION_KEY;
test('criptografia AES-GCM é autenticada e vinculada ao tenant e campo', () => {
  try {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'a'.repeat(64);
    const value = encryptNfcPii(20, 'customer-a', 'cpf', '52998224725');
    assert.ok(!value.includes('52998224725'));
    assert.equal(decryptNfcPii(20, 'customer-a', 'cpf', value), '52998224725');
    assert.throws(() => decryptNfcPii(21, 'customer-a', 'cpf', value));
    assert.throws(() => decryptNfcPii(20, 'customer-b', 'cpf', value));
    assert.throws(() => decryptNfcPii(20, 'customer-a', 'phone', value));
    assert.notEqual(nfcCpfFingerprints(20, '52998224725')[0], nfcCpfFingerprints(21, '52998224725')[0]);
    assert.equal(maskNfcCpf('52998224725'), '***.***.247-25');
    assert.equal(maskNfcPhone('85999999999'), '(**) *****-9999');
  } finally {
    if (original === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    else process.env.CREDENTIAL_ENCRYPTION_KEY = original;
  }
});
