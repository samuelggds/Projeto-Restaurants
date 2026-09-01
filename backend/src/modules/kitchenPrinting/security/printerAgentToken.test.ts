import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPrinterAgentCredential,
  parsePrinterAgentCredential,
  redactPrinterAgentToken,
  verifyPrinterAgentCredential,
} from './printerAgentToken.js';

const DEVICE_ID = '2f7a7df8-a444-4db9-a47a-5b79560352be';

test('credencial do agente usa segredo forte, hash e formato parseável', () => {
  const credential = createPrinterAgentCredential(DEVICE_ID);
  assert.match(credential.token, new RegExp(`^pa_${DEVICE_ID.replace(/-/gu, '\\-')}\\.`));
  assert.match(credential.tokenHash, /^[a-f0-9]{64}$/u);
  assert.equal(parsePrinterAgentCredential(credential.token)?.publicId, DEVICE_ID);
  assert.equal(verifyPrinterAgentCredential(credential.token, credential.tokenHash), true);
  assert.equal(credential.tokenHash.includes(credential.token), false);
});

test('rotação invalida segredo anterior e redaction nunca devolve o token completo', () => {
  const oldCredential = createPrinterAgentCredential(DEVICE_ID);
  const rotated = createPrinterAgentCredential(DEVICE_ID);
  assert.equal(verifyPrinterAgentCredential(oldCredential.token, rotated.tokenHash), false);
  assert.equal(redactPrinterAgentToken(rotated.token), `pa_${DEVICE_ID}.<redacted>`);
  assert.equal(redactPrinterAgentToken(rotated.token).includes(rotated.token), false);
});

test('tokens malformados são recusados', () => {
  for (const value of ['', 'Bearer abc', `pa_${DEVICE_ID}.curto`, `pa_${DEVICE_ID}:segredo`]) {
    assert.equal(parsePrinterAgentCredential(value), null);
  }
});
