import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAuditMetadata } from './auditMetadata.js';

test('metadados de auditoria preservam contexto e removem segredos em qualquer nível', () => {
  const after: Record<string, unknown> = {
    id: 10,
    apiKey: 'api-key-sensitive',
    nested: {
      password: 'password-sensitive',
      paymentLink: 'https://payment.example.test/secret',
      safeValue: 'visível',
    },
    items: [{ access_token: 'token-sensitive' }],
  };
  after.circular = after;

  const metadata = buildAuditMetadata({
    reason: '  Alteração solicitada pelo responsável  ',
    before: { active: false },
    after,
  });

  assert.equal(metadata.reason, 'Alteração solicitada pelo responsável');
  assert.deepEqual(metadata.before, { active: false });
  assert.deepEqual(metadata.after, {
    id: 10,
    apiKey: '[REDACTED]',
    nested: {
      password: '[REDACTED]',
      paymentLink: '[REDACTED]',
      safeValue: 'visível',
    },
    items: [{ access_token: '[REDACTED]' }],
    circular: '[CIRCULAR]',
  });
});
