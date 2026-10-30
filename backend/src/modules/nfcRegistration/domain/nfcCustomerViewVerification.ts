import crypto from 'node:crypto';

// The NFC tag token is only proof of possession; never reveal visitor data
// without a bounded, card-scoped verification of these three digits.
export function verifyNfcCustomerCpfPrefix(fullCpf: string, prefix: string) {
  if (!/^\d{11}$/u.test(fullCpf) || !/^\d{3}$/u.test(prefix)) return false;
  const expected = Buffer.from(fullCpf.slice(0, 3), 'utf8');
  const submitted = Buffer.from(prefix, 'utf8');
  return crypto.timingSafeEqual(expected, submitted);
}
export function nfcCustomerSessionHash(rawSession: string) {
  return crypto.createHash('sha256').update('nfc-customer-readonly:' + rawSession).digest('hex');
}
