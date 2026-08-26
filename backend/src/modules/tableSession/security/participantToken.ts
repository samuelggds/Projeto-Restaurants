import crypto from 'node:crypto';
import type { CookieOptions } from 'express';

const PARTICIPANT_COOKIE_PREFIX = 'table_participant_';
const DEFAULT_PARTICIPANT_TOKEN_HOURS = 12;

export function createParticipantToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashParticipantToken(token: string) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function isParticipantTokenShape(token: string | null | undefined) {
  return typeof token === 'string' && /^[a-zA-Z0-9_-]{43}$/.test(token);
}

export function getParticipantCookieName(sessionPublicId: string) {
  const safeSessionId = String(sessionPublicId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeSessionId) {
    throw new Error('Sessão pública inválida para identificar o participante.');
  }
  return `${PARTICIPANT_COOKIE_PREFIX}${safeSessionId}`;
}

export function parseCookieHeader(cookieHeader: string | undefined) {
  if (!cookieHeader) return {} as Record<string, string>;

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) return cookies;

    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!name || !value) return cookies;

    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      // Cookie malformado não deve derrubar o acesso público ao cardápio.
    }
    return cookies;
  }, {});
}

export function resolveParticipantTokenExpiration(sessionExpiresAt: Date | null, now = new Date()) {
  const configuredHours = Number(
    process.env.TABLE_PARTICIPANT_TOKEN_HOURS || DEFAULT_PARTICIPANT_TOKEN_HOURS,
  );
  const hours = Number.isFinite(configuredHours)
    ? Math.min(Math.max(configuredHours, 1), 24)
    : DEFAULT_PARTICIPANT_TOKEN_HOURS;
  const configuredExpiration = now.getTime() + hours * 60 * 60 * 1000;
  const sessionExpiration = sessionExpiresAt?.getTime();

  return new Date(
    Number.isFinite(sessionExpiration)
      ? Math.min(configuredExpiration, Number(sessionExpiration))
      : configuredExpiration,
  );
}

export function getParticipantCookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  };
}
