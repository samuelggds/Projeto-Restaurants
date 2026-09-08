import assert from 'node:assert/strict';
import test from 'node:test';
import { assertSafeRuntimeDatabaseEnvironment } from './runtimeDatabaseEnvironment.js';

const runtime = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://runtime:runtime-test-password@db:5432/test',
};

test('production accepts the restricted runtime connection', () => {
  assert.doesNotThrow(() => assertSafeRuntimeDatabaseEnvironment(runtime));
});

for (const name of ['DIRECT_URL', 'POSTGRES_PASSWORD', 'POSTGRES_PASSWORD_FILE']) {
  test(`production rejects ${name} without exposing its value`, () => {
    const sensitiveValue = 'owner-secret-that-must-not-be-logged';
    assert.throws(
      () => assertSafeRuntimeDatabaseEnvironment({ ...runtime, [name]: sensitiveValue }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes(name));
        assert.ok(!error.message.includes(sensitiveValue));
        return true;
      },
    );
  });
}

test('empty migration variables do not introduce credentials', () => {
  assert.doesNotThrow(() =>
    assertSafeRuntimeDatabaseEnvironment({ ...runtime, DIRECT_URL: '', POSTGRES_PASSWORD: ' ' }),
  );
});

test('local development remains compatible with existing environment files', () => {
  assert.doesNotThrow(() =>
    assertSafeRuntimeDatabaseEnvironment({ NODE_ENV: 'development', DIRECT_URL: 'local-owner' }),
  );
});
