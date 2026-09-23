import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import {
  googlePhonePublicConfig,
  isGooglePhoneAuthConfigured,
  normalizePhoneE164Br,
} from './GooglePhoneVerificationService.js';

const originalEnv = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

test('normaliza apenas telefones brasileiros plausiveis para E.164', () => {
  assert.equal(normalizePhoneE164Br('(85) 99999-1234'), '+5585999991234');
  assert.equal(normalizePhoneE164Br('+55 (85) 99999-1234'), '+5585999991234');
  assert.equal(normalizePhoneE164Br('85999991234'), '+5585999991234');
  assert.equal(normalizePhoneE164Br('123'), '');
  assert.equal(normalizePhoneE164Br(''), '');
});

test('SMS permanece fail-closed enquanto a configuracao Google nao estiver completa', async () => {
  process.env.GOOGLE_PHONE_AUTH_ENABLED = 'false';
  process.env.GOOGLE_IDENTITY_PLATFORM_API_KEY = 'api_key_example_with_more_than_20_chars';

  assert.equal(isGooglePhoneAuthConfigured(), false);
  assert.deepEqual(await googlePhonePublicConfig(), { enabled: false, siteKey: null });

  process.env.GOOGLE_PHONE_AUTH_ENABLED = 'true';
  delete process.env.GOOGLE_IDENTITY_PLATFORM_API_KEY;
  assert.equal(isGooglePhoneAuthConfigured(), false);
  assert.deepEqual(await googlePhonePublicConfig(), { enabled: false, siteKey: null });
});

test('frontend recebe a site key provisionada pelo Identity Platform quando o SMS esta habilitado', async () => {
  process.env.GOOGLE_PHONE_AUTH_ENABLED = 'true';
  process.env.GOOGLE_IDENTITY_PLATFORM_API_KEY = 'api_key_example_with_more_than_20_chars';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        recaptchaKey: 'projects/gastronexa-production/keys/site_key_example_with_more_than_20_chars',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )) as typeof fetch;

  try {
    assert.equal(isGooglePhoneAuthConfigured(), true);
    const config = await googlePhonePublicConfig();
    assert.deepEqual(config, {
      enabled: true,
      siteKey: 'site_key_example_with_more_than_20_chars',
    });
    assert.equal(Object.prototype.hasOwnProperty.call(config, 'apiKey'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
