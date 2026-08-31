import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const restaurantId = Number(req.user.restaurantId);
  if (
    req.user.role !== UserRole.ADMIN ||
    !Number.isInteger(restaurantId) ||
    restaurantId <= 0
  ) {
    return res.status(403).json({ error: 'Acesso negado!' });
  }
  return next();
}
