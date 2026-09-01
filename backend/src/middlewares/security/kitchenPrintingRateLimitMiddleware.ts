import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const ipKey = (req: Request) => ipKeyGenerator(String(req.ip || 'unknown'));

export const printerAgentRateLimitMiddleware = rateLimit({
  windowMs: 60_000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { error: 'Muitas solicitações do agente. Aguarde antes de tentar novamente.' },
});

export const printerCredentialRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${ipKey(req)}:${String(req.user?.restaurantId || 'none')}:${String(req.user?.id || 'none')}`,
  message: { error: 'Muitas operações de credencial. Aguarde antes de tentar novamente.' },
});
