import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_PATTERN =
  /^pa_([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/u;

function hash(value: string) {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function createPrinterAgentCredential(publicId: string) {
  const secret = randomBytes(32).toString('base64url');
  const token = `pa_${publicId}.${secret}`;
  return {
    token,
    tokenHash: hash(token).toString('hex'),
  };
}

export function parsePrinterAgentCredential(token: string) {
  const match = TOKEN_PATTERN.exec(token.trim());
  if (!match) return null;
  return { publicId: match[1], token: token.trim() };
}

export function verifyPrinterAgentCredential(token: string, expectedHash: string) {
  const actual = hash(token);
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

export function redactPrinterAgentToken(value: string) {
  const parsed = parsePrinterAgentCredential(value);
  return parsed ? `pa_${parsed.publicId}.<redacted>` : '<redacted>';
}
