import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function getImageEnhancementActorKey(req: Request) {
  const ip = ipKeyGenerator(String(req.ip || 'unknown').trim());
  const userId = String(req.user?.id || 'anonymous').slice(0, 32);
  const restaurantId = String(req.user?.restaurantId || 'no-restaurant').slice(0, 32);
  return `${ip}:${restaurantId}:${userId}`;
}

export const imageEnhancementRateLimitMiddleware = rateLimit({
  windowMs: Number(process.env.IMAGE_ENHANCEMENT_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.IMAGE_ENHANCEMENT_RATE_LIMIT_MAX_REQUESTS || 5),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getImageEnhancementActorKey,
  message: {
    error:
      'Muitas melhorias de imagem solicitadas. Aguarde alguns minutos antes de tentar novamente.',
  },
});
