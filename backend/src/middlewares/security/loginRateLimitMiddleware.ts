import { distributedRateLimitOptions } from './PostgresRateLimitStore.js';
import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function normalizeEmail(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .slice(0, 255);
}

function getClientIp(req: Request) {
  // Express resolves only the configured trusted proxy hop. The first raw
  // X-Forwarded-For value can be supplied by the requester and must not set the key.
  return req.ip;
}

const windowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const max = Number(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || 8);

export const loginRateLimitMiddleware = rateLimit({
  ...distributedRateLimitOptions('login:1'),
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = normalizeEmail((req.body as { email?: unknown })?.email);
    const ip = ipKeyGenerator(String(getClientIp(req) || 'unknown').trim());
    return `${ip}:${email || 'no-email'}`;
  },
  message: {
    error: 'Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente.',
  },
});
