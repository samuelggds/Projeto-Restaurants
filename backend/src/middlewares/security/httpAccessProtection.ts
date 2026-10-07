import type { Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { distributedRateLimitOptions } from './PostgresRateLimitStore.js';

export function normalizeOrigin(value: string) {
  const normalized = value.trim();
  let end = normalized.length;
  while (end > 0 && normalized[end - 1] === '/') end -= 1;
  return normalized.slice(0, end);
}

function sameOriginHost(req: { hostname?: string }, origin: string, isProduction: boolean) {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    if (isProduction && parsed.protocol !== 'https:') return false;
    return (
      parsed.hostname.toLowerCase() ===
      String(req.hostname || '')
        .trim()
        .toLowerCase()
    );
  } catch {
    return false;
  }
}

export function resolveGlobalRateLimitMax(isProduction: boolean, configuredMax: number) {
  return Number.isSafeInteger(configuredMax) && configuredMax > 0
    ? configuredMax
    : isProduction
      ? 3000
      : 5000;
}

export function applyCorsAndGlobalRateLimit(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = [process.env.CORS_ORIGINS || '', process.env.FRONTEND_URL || '']
    .flatMap((value) => value.split(','))
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
  const configuredMax = Number(process.env.RATE_LIMIT_MAX_REQUESTS);

  app.use((req, res, next) => {
    const fetchSite = String(req.headers['sec-fetch-site'] || '')
      .trim()
      .toLowerCase();
    const origin = normalizeOrigin(String(req.headers.origin || ''));
    const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
    const isTrustedOrigin = Boolean(
      origin && (allowedOrigins.includes(origin) || sameOriginHost(req, origin, isProduction)),
    );

    // Defesa adicional de CSRF para cookies SameSite=None. Clientes de API não
    // enviam Sec-Fetch-Site e continuam aceitos; navegadores cross-site precisam
    // vir de uma origem explicitamente autorizada.
    if (isProduction && fetchSite === 'cross-site' && isUnsafeMethod && !isTrustedOrigin) {
      return res.status(403).json({ error: 'Origem da requisicao nao autorizada.' });
    }

    return next();
  });

  app.use((req, res, next) =>
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = normalizeOrigin(origin);
        if (
          !isProduction ||
          allowedOrigins.includes(normalizedOrigin) ||
          sameOriginHost(req, normalizedOrigin, isProduction)
        ) {
          callback(null, true);
          return;
        }

        callback(Object.assign(new Error('Origem da requisicao nao autorizada.'), { status: 403 }));
      },
      credentials: true,
    })(req, res, next),
  );

  // CORS must run first so browsers can read a legitimate 429 response instead
  // of reducing it to an opaque "Network Error". Real-time screens can generate
  // many legitimate requests, so the global limiter protects against bursts
  // without competing with stricter route-specific security limiters.
  app.use(
    rateLimit({
      ...distributedRateLimitOptions('http-global'),
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
      max: resolveGlobalRateLimitMax(isProduction, configuredMax),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Muitas requisicoes. Tente novamente em instantes.',
      },
    }),
  );
}
