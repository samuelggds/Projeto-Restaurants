import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildWithdrawalReference,
  extractWithdrawalReference,
  validateWithdrawalAgainstRequest,
} from './asaasWithdrawalValidation.js';

const publicId = '11111111-2222-4333-8444-555555555555';
const now = new Date('2026-08-27T18:00:00.000Z');
const pending = {
  publicId,
  status: 'REQUESTED',
  value: 125.5,
  expiresAt: new Date('2026-08-27T18:10:00.000Z'),
  providerTransferId: null,
};

test('embute e recupera uma referencia interna opaca na descricao', () => {
  const description = `Saque solicitado ${buildWithdrawalReference(publicId)}`;
  assert.equal(extractWithdrawalReference(description), publicId);
});

test('aprova somente PIX com valor e solicitacao pendente correspondentes', () => {
  const result = validateWithdrawalAgainstRequest(
    { transferId: 'transfer-1', operationType: 'PIX', value: 125.5, description: '' },
    pending,
    now,
  );
  assert.deepEqual(result, { approved: true, repeated: false });
});

test('recusa solicitacao ausente, expirada, divergente ou ja consumida', () => {
  const input = { transferId: 'transfer-1', operationType: 'PIX', value: 125.5, description: '' };
  assert.equal(validateWithdrawalAgainstRequest(input, null, now).approved, false);
  assert.equal(
    validateWithdrawalAgainstRequest(
      input,
      { ...pending, expiresAt: new Date('2026-08-27T17:59:00.000Z') },
      now,
    ).approved,
    false,
  );
  assert.equal(
    validateWithdrawalAgainstRequest({ ...input, value: 126 }, pending, now).approved,
    false,
  );
  assert.equal(
    validateWithdrawalAgainstRequest(input, { ...pending, status: 'FAILED' }, now).approved,
    false,
  );
});

test('aceita repeticao idempotente apenas para a mesma transferencia', () => {
  const input = { transferId: 'transfer-1', operationType: 'PIX', value: 125.5, description: '' };
  assert.deepEqual(
    validateWithdrawalAgainstRequest(
      input,
      { ...pending, status: 'VALIDATED', providerTransferId: 'transfer-1' },
      now,
    ),
    { approved: true, repeated: true },
  );
});
