import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function getEmailKey(req: Request) {
  const email = String((req.body as { email?: unknown })?.email || '')
    .trim()
    .toLowerCase()
    .slice(0, 255);
  const ip = ipKeyGenerator(String(req.ip || 'unknown').trim());

  return `${ip}:${email || 'no-email'}`;
}

export const passwordResetRateLimitMiddleware = rateLimit({
  windowMs: Number(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS || 5),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getEmailKey,
  message: {
    error: 'Muitas solicitações de recuperação. Aguarde antes de tentar novamente.',
  },
});

export const registrationRateLimitMiddleware = rateLimit({
  windowMs: Number(process.env.REGISTRATION_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.REGISTRATION_RATE_LIMIT_MAX_REQUESTS || 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(String(req.ip || 'unknown').trim()),
  message: {
    error: 'Muitos cadastros originados deste endereço. Tente mais tarde.',
  },
});
