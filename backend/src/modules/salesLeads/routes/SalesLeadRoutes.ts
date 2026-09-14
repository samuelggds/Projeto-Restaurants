import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { distributedRateLimitOptions } from '../../../middlewares/security/PostgresRateLimitStore.js';
import salesLeadService from '../services/SalesLeadService.js';

const router = Router();
export const salesLeadRateLimit = rateLimit({
  ...distributedRateLimitOptions('sales-leads'),
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(String(req.ip || 'unknown')),
  message: { error: 'Muitas solicitações de contato. Aguarde antes de tentar novamente.' },
});

router.post('/', salesLeadRateLimit, async (req, res, next) => {
  try {
    const result = await salesLeadService.create(req.body, req.get('Idempotency-Key'));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(result.created ? 201 : 200).json(result.response);
  } catch (error) {
    return next(error);
  }
});

export default router;
