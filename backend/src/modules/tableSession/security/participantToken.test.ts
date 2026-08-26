import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createParticipantToken,
  getParticipantCookieName,
  getParticipantCookieOptions,
  hashParticipantToken,
  isParticipantTokenShape,
  parseCookieHeader,
  resolveParticipantTokenExpiration,
} from './participantToken.js';

test('gera token imprevisível e persiste somente um hash SHA-256', () => {
  const first = createParticipantToken();
  const second = createParticipantToken();

  assert.equal(isParticipantTokenShape(first), true);
  assert.equal(isParticipantTokenShape(second), true);
  assert.notEqual(first, second);
  assert.match(hashParticipantToken(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hashParticipantToken(first), first);
});

test('isola o cookie pelo identificador público da sessão', () => {
  const sessionId = '123e4567-e89b-42d3-a456-426614174000';
  const cookieName = getParticipantCookieName(sessionId);
  const cookies = parseCookieHeader(`${cookieName}=token-seguro; tema=claro`);

  assert.equal(cookieName, `table_participant_${sessionId}`);
  assert.equal(cookies[cookieName], 'token-seguro');
  assert.equal(cookies.tema, 'claro');
  assert.throws(() => getParticipantCookieName('!!!'), /sessão pública inválida/i);
});

test('token nunca ultrapassa a expiração da sessão e cookie é HttpOnly', () => {
  const now = new Date('2026-08-25T12:00:00.000Z');
  const sessionExpiresAt = new Date('2026-08-25T13:00:00.000Z');
  const expiration = resolveParticipantTokenExpiration(sessionExpiresAt, now);
  const options = getParticipantCookieOptions(expiration);

  assert.equal(expiration.toISOString(), sessionExpiresAt.toISOString());
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.path, '/');
  assert.equal(options.expires, expiration);
});
