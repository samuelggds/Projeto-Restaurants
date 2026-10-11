import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { PostgresRateLimitStore } from '../../../middlewares/security/PostgresRateLimitStore.js';
import { toImageEnhancementHttpError } from '../../imageEnhancement/controllers/EnhanceRestaurantImageController.js';
import { ManagedImageError } from '../domain/managedImageEnhancement.js';
import managedImageEnhancementService from '../services/ManagedImageEnhancementService.js';

const limitMessage = { error: 'Limite de melhorias da plataforma atingido. Aguarde antes de tentar novamente.', code: 'MANAGED_IMAGE_RATE_LIMITED' };
// Shared PostgreSQL counters always fail closed, including across replicas.
export const managedImageRateLimits = [
  rateLimit({
    store: new PostgresRateLimitStore('managedimage:actor:1'),
    passOnStoreError: false,
    windowMs: 15 * 60 * 1000,
    limit: 5,
    keyGenerator: (req) => String(req.user?.id || 'anonymous'),
    standardHeaders: true,
    legacyHeaders: false,
    message: limitMessage,
  }),
  rateLimit({
    store: new PostgresRateLimitStore('managedimage:platform:1'),
    passOnStoreError: false,
    windowMs: 24 * 60 * 60 * 1000,
    limit: 50,
    keyGenerator: () => 'platform',
    standardHeaders: true,
    legacyHeaders: false,
    message: limitMessage,
  }),
];

export async function enhanceManagedImage(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const result = await managedImageEnhancementService.execute(req.params.restaurantId, req.body, {
      userId: Number(req.user?.id || 0),
      userRole: req.user?.role ?? null,
    });
    return res.json(result);
  } catch (error) {
    if (error instanceof ManagedImageError) return res.status(error.status).json({ error: error.message, code: error.code });
    const mapped = toImageEnhancementHttpError(error);
    return res.status(mapped.status).json(mapped.body);
  }
}
