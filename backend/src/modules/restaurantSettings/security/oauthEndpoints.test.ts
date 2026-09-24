import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveMercadoPagoApiEndpoint,
  resolveOAuthEndpoint,
  validateConfiguredOAuthEndpoints,
} from './oauthEndpoints.js';

test('usa por padrão os endpoints oficiais do Mercado Pago', () => {
  const env = { NODE_ENV: 'production' };
  assert.equal(resolveOAuthEndpoint('MERCADO_PAGO_API', env), 'https://api.mercadopago.com');
  assert.equal(
    resolveOAuthEndpoint('MERCADO_PAGO_AUTHORIZATION', env),
    'https://auth.mercadopago.com/authorization',
  );
  assert.equal(resolveMercadoPagoApiEndpoint(env), 'https://api.mercadopago.com');
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

  assert.throws(
    () =>
      resolveMercadoPagoApiEndpoint({
        NODE_ENV: 'production',
        MP_API_BASE_URL: 'https://attacker.example',
        ALLOW_UNTRUSTED_OAUTH_ENDPOINTS: 'true',
      }),
    /MP_API_BASE_URL.*endpoint oficial.*producao/i,
  );
});

test('override local só funciona mediante flag explícita', () => {
  const oauthEnv = {
    NODE_ENV: 'development',
    MP_OAUTH_API_BASE_URL: 'http://127.0.0.1:4321/mock',
  };

  assert.throws(() => resolveOAuthEndpoint('MERCADO_PAGO_API', oauthEnv), /ALLOW_UNTRUSTED/i);
  assert.equal(
    resolveOAuthEndpoint('MERCADO_PAGO_API', {
      ...oauthEnv,
      ALLOW_UNTRUSTED_OAUTH_ENDPOINTS: 'true',
    }),
    'http://127.0.0.1:4321/mock',
  );

  const reconciliationEnv = {
    NODE_ENV: 'development',
    MP_API_BASE_URL: 'http://127.0.0.1:4321/reconciliation',
  };

  assert.throws(() => resolveMercadoPagoApiEndpoint(reconciliationEnv), /ALLOW_UNTRUSTED/i);
  assert.equal(
    resolveMercadoPagoApiEndpoint({
      ...reconciliationEnv,
      ALLOW_UNTRUSTED_OAUTH_ENDPOINTS: 'true',
    }),
    'http://127.0.0.1:4321/reconciliation',
  );
});

test('rejeita URL com credenciais, query string ou fragmento', () => {
  assert.throws(
    () =>
      resolveOAuthEndpoint('MERCADO_PAGO_API', {
        NODE_ENV: 'development',
        ALLOW_UNTRUSTED_OAUTH_ENDPOINTS: 'true',
        MP_OAUTH_API_BASE_URL: 'https://user:pass@example.test/base?secret=1',
      }),
    /nao pode conter credenciais/i,
  );
});
