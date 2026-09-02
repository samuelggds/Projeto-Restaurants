import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function actorKey(req: Request) {
  const ip = ipKeyGenerator(String(req.ip || 'unknown').trim());
  const userId = String(req.user?.id || 'anonymous').slice(0, 32);
  const restaurantId = String(req.user?.restaurantId || 'no-restaurant').slice(0, 32);
  return `${ip}:${restaurantId}:${userId}`;
}

export function createIngredientImageSearchRateLimit(
  options: { windowMs?: number; max?: number } = {},
) {
  return rateLimit({
    windowMs:
      options.windowMs ||
      Number(process.env.INGREDIENT_IMAGE_SEARCH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: options.max || Number(process.env.INGREDIENT_IMAGE_SEARCH_RATE_LIMIT_MAX_REQUESTS || 20),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: actorKey,
    message: {
      error:
        'Muitas buscas de imagem solicitadas. Aguarde alguns minutos antes de tentar novamente.',
    },
  });
}

export const ingredientImageSearchRateLimitMiddleware = createIngredientImageSearchRateLimit();
