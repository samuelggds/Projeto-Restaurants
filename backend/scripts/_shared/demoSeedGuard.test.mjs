import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { assertDemoSeedAllowed } from './demoSeedGuard.mjs';
import { databaseFingerprint } from './environmentGuard.mjs';

const original = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
});

function configure(environment = 'development') {
  process.env.NODE_ENV = environment;
  process.env.OPS_DATABASE_ENV = environment;
  process.env.DATABASE_URL = 'postgresql://demo:fake@127.0.0.1:1/disposable_seed';
  process.env.SEED_CONFIRM_DATABASE = `RESET_DEMO_${databaseFingerprint().identityHash}`;
}

test('seed recusa produção mesmo com liberação de scripts operacionais', () => {
  configure('production');
  process.env.OPS_ALLOW_PRODUCTION = 'ALLOW_PRODUCTION_OPERATIONS';
  process.env.OPS_DATABASE_FINGERPRINT_PRODUCTION = databaseFingerprint().identityHash;
  assert.throws(() => assertDemoSeedAllowed(), /bloqueada em produção/);
});

test('seed recusa ambientes ausentes, staging e identidade de banco divergente', () => {
  configure();
  delete process.env.NODE_ENV;
  assert.throws(() => assertDemoSeedAllowed(), /inválido ou ausente/);
  configure('staging');
  assert.throws(() => assertDemoSeedAllowed(), /development ou test/);
  configure();
  process.env.OPS_DATABASE_ENV = 'production';
  assert.throws(() => assertDemoSeedAllowed(), /marcado como production/);
});

test('seed exige confirmação vinculada ao banco exato antes de qualquer escrita', () => {
  configure();
  delete process.env.SEED_CONFIRM_DATABASE;
  assert.throws(() => assertDemoSeedAllowed(), /Confirmação ausente/);
  configure();
  process.env.DATABASE_URL = 'postgresql://demo:fake@127.0.0.1:1/another_database';
  assert.throws(() => assertDemoSeedAllowed(), /Confirmação ausente/);
  for (const environment of ['development', 'test']) {
    configure(environment);
    assert.equal(assertDemoSeedAllowed().target, environment);
  }
});
