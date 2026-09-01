import { FuncionarioSubRole, UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

export function kitchenPrintingRoleMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado.' });
  const restaurantId = Number(req.user.restaurantId);
  const isAdmin = req.user.role === UserRole.ADMIN;
  const isKitchen =
    req.user.role === UserRole.FUNCIONARIO && req.user.subRole === FuncionarioSubRole.COZINHA;
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0 || (!isAdmin && !isKitchen)) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  return next();
}
