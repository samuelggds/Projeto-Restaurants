// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import withdrawAsaasWalletService from '../services/WithdrawAsaasWalletService.js';
import withdrawAsaasWalletController from './WithdrawAsaasWalletController.js';

const originalExecute = withdrawAsaasWalletService.execute;

afterEach(() => {
  withdrawAsaasWalletService.execute = originalExecute;
});

function createResponse() {
  return {
    statusCode: 0,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('usa lista permitida de campos e remove qualquer chave PIX do resultado', async () => {
  const pixKey = 'financeiro@pizzaria.test';
  withdrawAsaasWalletService.execute = async () => ({
    withdrawalRequestId: 'request-public-id',
    transferId: 'transfer-1',
    status: 'PENDING',
    value: 50,
    operationType: 'PIX',
    dateCreated: '2026-08-27',
    pixKey,
    pixKeyMasked: pixKey,
  });
  const req = {
    user: { id: 10, restaurantId: 7 },
    body: { value: 50, pixKey },
  };
  const res = createResponse();

  await withdrawAsaasWalletController.handle(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    withdrawalRequestId: 'request-public-id',
    transferId: 'transfer-1',
    status: 'PENDING',
    value: 50,
    operationType: 'PIX',
    dateCreated: '2026-08-27',
  });
  assert.equal(JSON.stringify(res.body).includes(pixKey), false);
});

test('redige a chave PIX informada caso uma excecao inesperada a contenha', async () => {
  const pixKey = 'segredo@pizzaria.test';
  withdrawAsaasWalletService.execute = async () => {
    throw new Error(`Falha inesperada para ${pixKey}`);
  };
  const req = {
    user: { id: 10, restaurantId: 7 },
    body: { value: 50, pixKey },
  };
  const res = createResponse();

  await withdrawAsaasWalletController.handle(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(JSON.stringify(res.body).includes(pixKey), false);
  assert.match(res.body.error, /DADO REDIGIDO/);
});
