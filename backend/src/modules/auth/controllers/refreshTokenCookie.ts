import type { Request, Response } from 'express';

const COOKIE_NAME = '__Host-pizza_refresh';
const LOCAL_COOKIE_NAME = 'pizza_refresh';
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
type RefreshCookieSameSite = 'lax' | 'strict' | 'none';

function cookieName() {
  return process.env.NODE_ENV === 'production' ? COOKIE_NAME : LOCAL_COOKIE_NAME;
}

export function resolveRefreshCookieSameSite(
  value = process.env.REFRESH_COOKIE_SAME_SITE,
): RefreshCookieSameSite {
  const normalized = String(value || 'lax').trim().toLowerCase();
  return ['lax', 'strict', 'none'].includes(normalized)
    ? (normalized as RefreshCookieSameSite)
    : 'lax';
}

export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie(cookieName(), refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: resolveRefreshCookieSameSite(),
    path: '/',
    maxAge: FOURTEEN_DAYS_MS,
  });
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(cookieName(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: resolveRefreshCookieSameSite(),
    path: '/',
  });
}

export function readRefreshToken(req: Request) {
  const cookies = String(req.headers.cookie || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const prefix = `${cookieName()}=`;
  const cookie = cookies.find((entry) => entry.startsWith(prefix));
  if (cookie) {
    try {
      return decodeURIComponent(cookie.slice(prefix.length));
    } catch {
      return '';
    }
  }

  // Compatibilidade temporária para clientes não-browser fora de produção.
  return process.env.NODE_ENV === 'production' ? '' : String(req.body?.refreshToken || '').trim();
}

export function moveRefreshTokenToCookie<T extends object>(res: Response, result: T) {
  if (!('refreshToken' in result) || typeof result.refreshToken !== 'string') return result;
  setRefreshTokenCookie(res, result.refreshToken);
  const { refreshToken: _refreshToken, ...publicResult } = result as T & { refreshToken: string };
  return publicResult;
}
