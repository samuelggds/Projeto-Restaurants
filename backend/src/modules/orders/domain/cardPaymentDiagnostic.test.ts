import assert from 'node:assert/strict';
import test from 'node:test';
import { extractPaymentDiagnostic } from './cardPaymentDiagnostic.js';

test('preserva os códigos de detalhes posteriores e os IDs para suporte', () => {
  const result = extractPaymentDiagnostic({
    errors: [
      {
        code: 'card_payment_failed',
        details: [{ message: 'generic' }, { status: 'failed', code: 'high_risk' }],
      },
    ],
    data: {
      id: 'ORD-123',
      transactions: { payments: [{ id: 'PAY-123', status: 'failed', status_detail: 'high_risk' }] },
    },
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.statusDetail, 'high_risk');
  assert.equal(result.providerOrderId, 'ORD-123');
  assert.equal(result.providerPaymentId, 'PAY-123');
  assert.deepEqual(result.providerCodes, ['card_payment_failed', 'high_risk']);
});

test('descarta mensagens, credenciais e códigos não reconhecidos em vez de ecoar dados', () => {
  const result = extractPaymentDiagnostic({
    code: 'secret_token_123',
    message: 'CVV 123 CPF 12345678901 cartão 4111111111111111',
    errors: [{ code: 'APP_USR-private', details: [{ code: 'cliente@example.test' }] }],
    data: {
      id: 'APP_USR-private',
      transactions: {
        payments: [
          {
            id: 'CPF 12345678901',
            status: 'failed',
            status_detail: 'secret_token_123',
            token: 'private-token',
          },
        ],
      },
    },
  });
  assert.equal(result.hasUnrecognizedCode, true);
  assert.equal(result.providerOrderId, null);
  assert.equal(result.providerPaymentId, null);
  assert.equal(result.statusDetail, null);
  assert.deepEqual(result.providerCodes, []);
  assert.doesNotMatch(JSON.stringify(result), /private|123|CPF|CVV|example/);
});

test('ausência de motivo não inventa CVV incorreto nem antifraude', () => {
  const result = extractPaymentDiagnostic({ status: 'failed', message: 'recusado' });
  assert.equal(result.status, 'failed');
  assert.equal(result.statusDetail, null);
  assert.deepEqual(result.providerCodes, []);
});

test('estado desconhecido da transação nunca herda processed da order', () => {
  const result = extractPaymentDiagnostic({
    status: 'processed',
    transactions: { payments: [{ status: 'new_pending_status' }] },
  });
  assert.equal(result.status, 'unknown');
  assert.equal(result.hasUnrecognizedCode, true);
});
