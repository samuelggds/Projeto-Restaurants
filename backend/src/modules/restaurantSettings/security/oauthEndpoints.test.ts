import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveOAuthEndpoint, validateConfiguredOAuthEndpoints } from './oauthEndpoints.js';

test('usa por padrão os endpoints oficiais dos provedores', () => {
  const env = { NODE_ENV: 'production' };
  assert.equal(resolveOAuthEndpoint('MERCADO_PAGO_API', env), 'https://api.mercadopago.com');
  assert.equal(resolveOAuthEndpoint('PAGBANK_API', env), 'https://api.pagseguro.com');
  assert.doesNotThrow(() => validateConfiguredOAuthEndpoints(env));
});

test('produção rejeita host arbitrário mesmo com flag de override', () => {
  assert.throws(
    () =>
      resolveOAuthEndpoint('MERCADO_PAGO_API', {
        NODE_ENV: 'production',
        MP_OAUTH_API_BASE_URL: 'https://attacker.example',
        ALLOW_UNTRUSTED_OAUTH_ENDPOINTS: 'true',
      }),
    /endpoint oficial.*producao/i,
  );
});

test('override local só funciona mediante flag explícita', () => {
  const baseEnv = {
    NODE_ENV: 'development',
    MP_OAUTH_API_BASE_URL: 'http://127.0.0.1:4321/mock',
  };
  assert.throws(() => resolveOAuthEndpoint('MERCADO_PAGO_API', baseEnv), /ALLOW_UNTRUSTED/i);
  assert.equal(
    resolveOAuthEndpoint('MERCADO_PAGO_API', {
      ...baseEnv,
      ALLOW_UNTRUSTED_OAUTH_ENDPOINTS: 'true',
    }),
    'http://127.0.0.1:4321/mock',
  );
});

test('rejeita URL com credenciais, query string ou fragmento', () => {
  assert.throws(
    () =>
      resolveOAuthEndpoint('PAGBANK_API', {
        NODE_ENV: 'development',
        ALLOW_UNTRUSTED_OAUTH_ENDPOINTS: 'true',
        PAGBANK_CONNECT_API_URL: 'https://user:pass@example.test/base?secret=1',
      }),
    /nao pode conter credenciais/i,
  );
});

test('sandbox oficial do PagBank é permitido fora de produção sem liberar hosts arbitrários', () => {
  assert.equal(
    resolveOAuthEndpoint('PAGBANK_API', {
      NODE_ENV: 'test',
      PAGBANK_CONNECT_API_URL: 'https://sandbox.api.pagseguro.com/',
    }),
    'https://sandbox.api.pagseguro.com',
  );
});
