import type { Request } from 'express';
import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import AdminPortalController from '../controllers/AdminPortalController.js';

const router = Router();

export function adminPortalRateLimitKey(req: Request) {
  const ip = ipKeyGenerator(String(req.ip || 'unknown').trim());
  const slug = String(req.params.slug || '')
    .trim()
    .toLowerCase()
    .slice(0, 100);
  return `${ip}:${slug || 'unknown-tenant'}`;
}

export const exchangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: adminPortalRateLimitKey,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
});

export const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: adminPortalRateLimitKey,
  message: { error: 'Muitas validações. Tente novamente em instantes.' },
});

router.post('/:slug/exchange', exchangeLimiter, (req, res, next) =>
  AdminPortalController.exchange(req, res, next),
);
router.post('/:slug/verify', verifyLimiter, (req, res, next) =>
  AdminPortalController.verify(req, res, next),
);

export default router;
