import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma.js';
import restaurantAccessService from '../modules/billing/services/RestaurantAccessService.js';

export async function resolvePublicRestaurantId(req: Request) {
  const directId = Number(
    req.params.restaurantId || req.query.restaurantId || req.body?.restaurantId || 0,
  );
  if (Number.isInteger(directId) && directId > 0) return directId;

  const slug = String(req.params.slug || req.query.slug || '').trim();
  if (slug) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    });
    return restaurant?.id || null;
  }

  if (req.path.endsWith('/default')) {
    const restaurant = await prisma.restaurant.findFirst({
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    return restaurant?.id || null;
  }

  return null;
}

export async function publicRestaurantBillingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const restaurantId = await resolvePublicRestaurantId(req);
    if (!restaurantId) return next();

    const decision = await restaurantAccessService.evaluate(restaurantId);
    if (!decision) return res.status(404).json({ error: 'Restaurante não encontrado.' });
    if (!('code' in decision)) return next();

    // Rotas públicas não expõem informações financeiras nem links de pagamento.
    return res.status(403).json({
      code: decision.code,
      blocked: true,
      reason: decision.reason,
      restaurantId,
      error: 'Restaurante temporariamente indisponível.',
    });
  } catch {
    return res.status(500).json({ error: 'Erro ao validar disponibilidade do restaurante.' });
  }
}
