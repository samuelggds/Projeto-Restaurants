import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDistributedConfig } from './distributedConfig.js';

test('impede múltiplas réplicas com proteções e eventos apenas em memória', () => {
  assert.throws(() => validateDistributedConfig({ API_REPLICA_COUNT: '2' }), /DISTRIBUTED_STATE/u);
  assert.throws(() => validateDistributedConfig({ API_REPLICA_COUNT: '-1' }), /API_REPLICA_COUNT/u);
  assert.doesNotThrow(() =>
    validateDistributedConfig({ API_REPLICA_COUNT: '2', DISTRIBUTED_STATE: 'postgres' }),
  );
  assert.doesNotThrow(() => validateDistributedConfig({}));
});
