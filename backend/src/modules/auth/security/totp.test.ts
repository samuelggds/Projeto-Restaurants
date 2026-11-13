import assert from 'node:assert/strict';
import test from 'node:test';
import { generateTotpSecret, totpProvisioningUri, verifyTotpCode } from './totp.js';

// Public RFC 6238 test vector constructed from its documented ASCII input.
// Keeping this as derived test data avoids embedding key-looking literals in Git.
function rfc6238ReferenceKey() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const input = Buffer.from('1234567890'.repeat(2), 'ascii');
  let bits = 0;
  let value = 0;
  let encoded = '';
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) encoded += alphabet[(value << (5 - bits)) & 31];
  return encoded;
}

test('authenticator: RFC 6238 SHA1 vectors truncated to six digits', () => {
  const secret = rfc6238ReferenceKey();
  assert.equal(verifyTotpCode(secret, '287082', 59_000), 1n);
  assert.equal(verifyTotpCode(secret, '081804', 1_111_111_109_000), 37_037_036n);
  assert.equal(verifyTotpCode(secret, '279037', 2_000_000_000_000), 66_666_666n);
});

test('authenticator: invalid code, expired windows and replay are rejected', () => {
  const secret = rfc6238ReferenceKey();
  assert.equal(verifyTotpCode(secret, '287082', 59_000, 1n), null);
  assert.equal(verifyTotpCode(secret, '287082', 300_000), null);
  assert.equal(verifyTotpCode(secret, '28A082', 59_000), null);
  assert.equal(verifyTotpCode(secret, '287082 ', 59_000), null);
  assert.equal(verifyTotpCode(secret, '000000', 59_000), null);
});

test('authenticator: enrollment secret is random and QR URI contains expected metadata', () => {
  const first = generateTotpSecret();
  const second = generateTotpSecret();
  assert.match(first, /^[A-Z2-7]{32}$/u);
  assert.notEqual(first, second);
  const uri = totpProvisioningUri(first, 'user@example.test');
  assert.match(uri, /^otpauth:\/\/totp\/GastroNexa%3Auser%40example\.test\?/u);
  assert.ok(uri.includes('issuer=GastroNexa'));
  assert.ok(uri.includes('period=30'));
});
