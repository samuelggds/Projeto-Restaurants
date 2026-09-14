import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeRoleSettings } from './provisionRuntimeRole.mjs';

const owner = 'postgresql://owner:owner-password@db:5432/app';
test('provisionamento rejeita outro servidor, owner reutilizado e senha fraca', () => {
  assert.throws(() => runtimeRoleSettings(owner, 'postgresql://runtime:long-password-123456789@other:5432/app'));
  assert.throws(() => runtimeRoleSettings(owner, 'postgresql://owner:long-password-123456789@db:5432/app'));
  assert.throws(() => runtimeRoleSettings(owner, 'postgresql://runtime:short@db:5432/app'));
  assert.throws(() => runtimeRoleSettings(owner, 'postgresql://bad%22name:long-password-123456789@db:5432/app'));
});
test('provisionamento aceita senha escapada e nome runtime distinto', () => {
  assert.deepEqual(runtimeRoleSettings(owner, 'postgresql://pizza_runtime:long%40password%27123456789@db:5432/app'), {
    role: 'pizza_runtime', password: "long@password'123456789",
  });
});
