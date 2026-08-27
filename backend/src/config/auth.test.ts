import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { getJwtExpiresIn } from './auth.js';

const originalExpiresIn = process.env.JWT_EXPIRES_IN;

afterEach(() => {
  if (originalExpiresIn === undefined) delete process.env.JWT_EXPIRES_IN;
  else process.env.JWT_EXPIRES_IN = originalExpiresIn;
});

test('access token expira em 15 minutos por padrão', () => {
  delete process.env.JWT_EXPIRES_IN;
  assert.equal(getJwtExpiresIn(), '15m');
});

test('permite sobrescrever TTL explicitamente pelo ambiente', () => {
  process.env.JWT_EXPIRES_IN = '20m';
  assert.equal(getJwtExpiresIn(), '20m');
});
