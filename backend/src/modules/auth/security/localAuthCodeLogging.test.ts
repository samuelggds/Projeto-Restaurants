import assert from 'node:assert/strict';
import test from 'node:test';
import { canLogLocalAuthCode } from './localAuthCodeLogging.js';

test('códigos locais exigem opt-in explícito e nunca são logados em produção', () => {
  assert.equal(canLogLocalAuthCode({ NODE_ENV: 'development' }), false);
  assert.equal(
    canLogLocalAuthCode({ NODE_ENV: 'development', ALLOW_LOCAL_AUTH_CODE_LOGGING: 'true' }),
    true,
  );
  assert.equal(
    canLogLocalAuthCode({ NODE_ENV: 'production', ALLOW_LOCAL_AUTH_CODE_LOGGING: 'true' }),
    false,
  );
});
