// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import {
  clearRefreshTokenCookie,
  moveRefreshTokenToCookie,
  readRefreshToken,
  setRefreshTokenCookie,
} from './refreshTokenCookie.js';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

function responseDouble() {
  const calls = [];
  return {
    calls,
    cookie: (...args) => calls.push(['cookie', ...args]),
    clearCookie: (...args) => calls.push(['clearCookie', ...args]),
  };
}

test('cookie __Host de produção usa atributos aceitos pelo navegador', () => {
  process.env.NODE_ENV = 'production';
  const response = responseDouble();

  setRefreshTokenCookie(response, 'refresh-value');
  clearRefreshTokenCookie(response);

  const [, name, value, options] = response.calls[0];
  assert.equal(name, '__Host-pizza_refresh');
  assert.equal(value, 'refresh-value');
  assert.equal(options.path, '/');
  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(response.calls[1][2].path, '/');
});

test('move refresh para cookie HttpOnly e nunca o devolve no JSON', () => {
  process.env.NODE_ENV = 'test';
  const response = responseDouble();
  const result = moveRefreshTokenToCookie(response, {
    accessToken: 'access-value',
    refreshToken: 'refresh-value',
  });

  assert.deepEqual(result, { accessToken: 'access-value' });
  assert.equal(response.calls[0][1], 'pizza_refresh');
});

test('produção lê somente o cookie e ignora refresh enviado no body', () => {
  process.env.NODE_ENV = 'production';
  assert.equal(
    readRefreshToken({
      headers: { cookie: '__Host-pizza_refresh=encoded%20token' },
      body: { refreshToken: 'body-token' },
    }),
    'encoded token',
  );
  assert.equal(readRefreshToken({ headers: {}, body: { refreshToken: 'body-token' } }), '');
});
