import type { Express } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');

export function resolveGlobalRateLimitMax(isProduction: boolean, configuredMax: number) {
  return isProduction ? configuredMax : Math.max(configuredMax, 5000);
}

export function applyCorsAndGlobalRateLimit(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = [process.env.CORS_ORIGINS || '', process.env.FRONTEND_URL || '']
    .flatMap((value) => value.split(','))
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
  const configuredMax = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300);

  app.use((req, res, next) => {
    const fetchSite = String(req.headers['sec-fetch-site'] || '').trim().toLowerCase();
    const origin = normalizeOrigin(String(req.headers.origin || ''));
    const isUnsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
    const isTrustedOrigin = Boolean(origin && allowedOrigins.includes(origin));

    // Defesa adicional de CSRF para cookies SameSite=None. Clientes de API não
    // enviam Sec-Fetch-Site e continuam aceitos; navegadores cross-site precisam
    // vir de uma origem explicitamente autorizada.
    if (isProduction && fetchSite === 'cross-site' && isUnsafeMethod && !isTrustedOrigin) {
      return res.status(403).json({ error: 'Origem da requisicao nao autorizada.' });
    }

    return next();
  });

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin = normalizeOrigin(origin);

        if (!isProduction || allowedOrigins.includes(normalizedOrigin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  // CORS must run first so browsers can read a legitimate 429 response instead
  // of reducing it to an opaque "Network Error". Development screens poll
  // several real-time resources, so their safe local default is higher.
  app.use(
    rateLimit({
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
