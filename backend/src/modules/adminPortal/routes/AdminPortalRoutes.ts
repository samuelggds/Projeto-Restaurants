import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import AdminPortalController from '../controllers/AdminPortalController.js';

const router = Router();

const portalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
});

router.post('/:slug/exchange', portalLimiter, (req, res, next) =>
  AdminPortalController.exchange(req, res, next),
);
router.post('/:slug/verify', portalLimiter, (req, res, next) =>
  AdminPortalController.verify(req, res, next),
);

export default router;
