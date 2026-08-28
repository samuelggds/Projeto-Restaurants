// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { SuccessfulLoginRecorderService } from './SuccessfulLoginRecorderService.js';

test('registra o login concluído', async () => {
  const calls = [];
  const service = new SuccessfulLoginRecorderService(
    {
      recordSuccessfulLogin: async (userId) => calls.push(userId),
    },
    () => {
      throw new Error('não deveria registrar falha');
    },
  );

  assert.equal(await service.execute(42), true);
  assert.deepEqual(calls, [42]);
});

test('falha de telemetria não invalida uma autenticação já concluída', async () => {
  const logs = [];
  const service = new SuccessfulLoginRecorderService(
    {
      recordSuccessfulLogin: async () => {
        throw new Error('database unavailable');
      },
    },
    (event, context) => logs.push({ event, context }),
  );

  assert.equal(await service.execute(77), false);
  assert.deepEqual(logs, [
    {
      event: '[LAST_LOGIN_UPDATE_FAILED]',
      context: { userId: 77, errorType: 'Error' },
    },
  ]);
});
