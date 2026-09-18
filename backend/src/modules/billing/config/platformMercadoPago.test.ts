import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import {
  getPlatformMercadoPagoAccessToken,
  requirePlatformMercadoPagoAccessToken,
} from './platformMercadoPago.js';

const originalEnv = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

test('produção exige credencial dedicada do Mercado Pago da plataforma', () => {
  process.env.NODE_ENV = 'production';
  delete process.env.PLATFORM_MP_ACCESS_TOKEN;
  process.env.MP_ACCESS_TOKEN = 'token-restaurante-ou-legado';

  assert.equal(getPlatformMercadoPagoAccessToken(), '');
  assert.throws(
    () => requirePlatformMercadoPagoAccessToken(),
    /PLATFORM_MP_ACCESS_TOKEN/,
  );
});

test('mensalidade usa PLATFORM_MP_ACCESS_TOKEN quando configurado', () => {
  process.env.NODE_ENV = 'production';
  process.env.PLATFORM_MP_ACCESS_TOKEN = 'token-plataforma';
  process.env.MP_ACCESS_TOKEN = 'token-legado';

  assert.equal(getPlatformMercadoPagoAccessToken(), 'token-plataforma');
  assert.equal(requirePlatformMercadoPagoAccessToken(), 'token-plataforma');
});
