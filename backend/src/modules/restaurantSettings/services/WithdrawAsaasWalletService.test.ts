// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import {
  ASAAS_WITHDRAW_REQUEST_TIMEOUT_MS,
  default as withdrawAsaasWalletService,
} from './WithdrawAsaasWalletService.js';

const originalFindByRestaurantId = restaurantSettingsRepository.findByRestaurantId;
const originalCreate = prisma.asaasWithdrawalRequest.create;
const originalUpdateMany = prisma.asaasWithdrawalRequest.updateMany;
const originalFetch = globalThis.fetch;
const originalAsaasBaseUrl = process.env.ASAAS_API_BASE_URL;

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId = originalFindByRestaurantId;
  prisma.asaasWithdrawalRequest.create = originalCreate;
  prisma.asaasWithdrawalRequest.updateMany = originalUpdateMany;
  globalThis.fetch = originalFetch;
  restoreEnv('ASAAS_API_BASE_URL', originalAsaasBaseUrl);
});

function arrangeWithdrawal() {
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    asaasAccessToken: 'token-subconta',
    pixKey: 'chave-configurada@pizzaria.test',
  });
  prisma.asaasWithdrawalRequest.create = async () => ({
    id: 41,
    publicId: '11111111-2222-4333-8444-555555555555',
  });
  prisma.asaasWithdrawalRequest.updateMany = async () => ({ count: 1 });
}

test('aplica timeout explicito e nunca devolve a chave PIX completa', async () => {
  arrangeWithdrawal();
  process.env.ASAAS_API_BASE_URL = 'https://sandbox.asaas.test/';
  const pixKey = 'financeiro@pizzaria.test';
  let requestInit = null;
  const updates = [];
  prisma.asaasWithdrawalRequest.updateMany = async (args) => {
    updates.push(args);
    return { count: 1 };
  };

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://sandbox.asaas.test/v3/transfers');
    requestInit = init;

    return new Response(
      JSON.stringify({
        id: pixKey,
        status: `PENDING-${pixKey}`,
        value: 125.5,
        operationType: 'PIX',
        dateCreated: pixKey,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await withdrawAsaasWalletService.execute({
    restaurantId: 7,
    requestedByUserId: 10,
    value: 125.5,
    pixKey,
  });

  assert.ok(requestInit.signal instanceof AbortSignal);
  assert.equal(requestInit.signal.aborted, false);
  assert.equal(ASAAS_WITHDRAW_REQUEST_TIMEOUT_MS, 15_000);
  assert.equal(JSON.parse(String(requestInit.body)).pixAddressKey, pixKey);
  assert.equal(result.withdrawalRequestId, '11111111-2222-4333-8444-555555555555');
  assert.equal(Object.hasOwn(result, 'pixKey'), false);
  assert.equal(JSON.stringify(result).includes(pixKey), false);
  assert.equal(JSON.stringify(updates).includes(pixKey), false);
  assert.match(result.transferId, /REDIGIDO/);
});

test('marca a solicitacao como falha e retorna erro seguro quando o timeout dispara', async () => {
  arrangeWithdrawal();
  const pixKey = 'timeout@pizzaria.test';
  const updates = [];
  prisma.asaasWithdrawalRequest.updateMany = async (args) => {
    updates.push(args);
    return { count: 1 };
  };
  globalThis.fetch = async (_input, init) => {
    assert.ok(init.signal instanceof AbortSignal);
    const timeoutError = new Error(`timeout ao transferir para ${pixKey}`);
    timeoutError.name = 'TimeoutError';
    throw timeoutError;
  };

  let receivedError;
  try {
    await withdrawAsaasWalletService.execute({
      restaurantId: 7,
      requestedByUserId: 10,
      value: 50,
      pixKey,
    });
  } catch (error) {
    receivedError = error;
  }

  assert.match(receivedError.message, /Tempo limite excedido/i);
  assert.equal(receivedError.message.includes(pixKey), false);
  assert.deepEqual(updates[0].data, { status: 'FAILED' });
});

test('nao repassa ao cliente erro do provedor que contenha a chave PIX', async () => {
  arrangeWithdrawal();
  const pixKey = 'segredo-pix@pizzaria.test';
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ errors: [{ description: `Chave ${pixKey} recusada pelo Asaas` }] }),
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    );

  let receivedError;
  try {
    await withdrawAsaasWalletService.execute({
      restaurantId: 7,
      requestedByUserId: 10,
      value: 50,
      pixKey,
    });
  } catch (error) {
    receivedError = error;
  }

  assert.match(receivedError.message, /Asaas recusou a solicitacao/i);
  assert.equal(receivedError.message.includes(pixKey), false);
});
