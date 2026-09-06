// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import {
  clearRefreshTokenCookie,
  moveRefreshTokenToCookie,
  readRefreshToken,
  resolveRefreshCookieSameSite,
  setRefreshTokenCookie,
} from './refreshTokenCookie.js';

const originalNodeEnv = process.env.NODE_ENV;
const originalRefreshCookieSameSite = process.env.REFRESH_COOKIE_SAME_SITE;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.REFRESH_COOKIE_SAME_SITE = originalRefreshCookieSameSite;
});

test('permite SameSite=None para frontend e API em sites diferentes', () => {
  process.env.NODE_ENV = 'production';
  process.env.REFRESH_COOKIE_SAME_SITE = 'none';
  const response = responseDouble();

  setRefreshTokenCookie(response, 'refresh-value');

  assert.equal(resolveRefreshCookieSameSite(), 'none');
  assert.equal(response.calls[0][3].sameSite, 'none');
  assert.equal(response.calls[0][3].secure, true);
});

function responseDouble() {
  const calls = [];
  return {
    calls,
    cookie: (...args) => calls.push(['cookie', ...args]),
    clearCookie: (...args) => calls.push(['clearCookie', ...args]),
  };
}

test('cookie __Host de produção usa atributos seguros e não persistentes', () => {
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
  assert.equal('maxAge' in options, false);
  assert.equal('expires' in options, false);
  assert.equal(response.calls[1][2].path, '/');
});

test('move refresh para cookie HttpOnly e nunca o devolve no JSON', () => {
  process.env.NODE_ENV = 'test';
  const response = responseDouble();
  const result = moveRefreshTokenToCookie(response, {
    accessToken: 'access-value',
    refreshToken: 'refresh-value',
    userId: 17,
  });

  assert.deepEqual(result, { accessToken: 'access-value', userId: 17 });
  assert.equal(response.calls[0][1], 'pizza_refresh');
  assert.equal('maxAge' in response.calls[0][3], false);
  assert.equal('expires' in response.calls[0][3], false);
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
