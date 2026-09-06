import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import AdminPortalController from '../controllers/AdminPortalController.js';

const router = Router();

const exchangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas validações. Tente novamente em instantes.' },
});

router.post('/:slug/exchange', exchangeLimiter, (req, res, next) =>
  AdminPortalController.exchange(req, res, next),
);
router.post('/:slug/verify', verifyLimiter, (req, res, next) =>
  AdminPortalController.verify(req, res, next),
);

export default router;
