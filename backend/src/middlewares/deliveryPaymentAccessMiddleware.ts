import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';

export function deliveryPaymentAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

  const role = String(req.user.role || '').toUpperCase();
  const restaurantId = Number(req.user.restaurantId || 0);
  const userId = Number(req.user.id || 0);
  const allowed = role === UserRole.ADMIN || role === UserRole.MOTOQUEIRO;

  if (
    !allowed ||
    !Number.isInteger(restaurantId) ||
    restaurantId <= 0 ||
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    return res.status(403).json({ error: 'Acesso financeiro negado' });
  }

  return next();
}
