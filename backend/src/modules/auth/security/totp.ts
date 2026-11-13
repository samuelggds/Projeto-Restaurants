import crypto from 'node:crypto';

// RFC 6238 / RFC 4226, SHA-1 for interoperability with standard authenticators.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_MS = 30_000;
const CODE_DIGITS = 6;

export function generateTotpSecret() {
  const input = crypto.randomBytes(20);
  let value = 0;
  let bits = 0;
  let encoded = '';
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) encoded += ALPHABET[(value << (5 - bits)) & 31];
  return encoded;
}

function decodeBase32(value: string) {
  const normalized = value.trim().toUpperCase().replace(/=+$/u, '');
  if (!/^[A-Z2-7]{16,128}$/u.test(normalized)) {
    throw new Error('Invalid authenticator secret');
  }
  const output: number[] = [];
  let buffer = 0;
  let count = 0;
  for (const char of normalized) {
    buffer = (buffer << 5) | ALPHABET.indexOf(char);
    count += 5;
    if (count >= 8) {
      output.push((buffer >>> (count - 8)) & 255);
      count -= 8;
    }
  }
  return Buffer.from(output);
}

function codeForStep(secret: string, step: number) {
  if (!Number.isSafeInteger(step) || step < 0) return null;
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hash = crypto.createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const numeric = ((hash[offset] & 0x7f) << 24) |
    (hash[offset + 1] << 16) |
    (hash[offset + 2] << 8) |
    hash[offset + 3];
  return String(numeric % 10 ** CODE_DIGITS).padStart(CODE_DIGITS, '0');
}

export function verifyTotpCode(
  secret: string,
  candidate: string,
  now = Date.now(),
  lastUsedStep = -1n,
): bigint | null {
  if (!/^\d{6}$/u.test(candidate) || !Number.isFinite(now)) return null;
  const currentStep = Math.floor(now / STEP_MS);
  const supplied = Buffer.from(candidate, 'ascii');
  for (const offset of [0, -1, 1]) {
    const step = currentStep + offset;
    if (step < 0 || BigInt(step) <= lastUsedStep) continue;
    const expected = codeForStep(secret, step);
    if (expected && crypto.timingSafeEqual(supplied, Buffer.from(expected, 'ascii'))) {
      return BigInt(step);
    }
  }
  return null;
}

export function totpProvisioningUri(secret: string, email: string) {
  const label = 'GastroNexa:' + email.trim().toLowerCase();
  const query = new URLSearchParams({
    secret,
    issuer: 'GastroNexa',
    algorithm: 'SHA1',
    digits: String(CODE_DIGITS),
    period: String(STEP_MS / 1000),
  });
  return 'otpauth://totp/' + encodeURIComponent(label) + '?' + query.toString();
}
