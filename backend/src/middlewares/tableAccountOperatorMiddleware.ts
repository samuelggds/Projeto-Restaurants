import type { NextFunction, Request, Response } from 'express';
import { FuncionarioSubRole, UserRole } from '@prisma/client';

export function tableAccountOperatorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const role = String(req.user.role || '').toUpperCase();
  const subRole = String(req.user.subRole || '').toUpperCase();
  const restaurantId = Number(req.user.restaurantId || 0);
  const isAdmin = role === UserRole.ADMIN;
  const isCashStaff =
    role === UserRole.FUNCIONARIO &&
    (subRole === FuncionarioSubRole.GARCOM || subRole === FuncionarioSubRole.ATENDENTE);

  if ((!isAdmin && !isCashStaff) || !Number.isInteger(restaurantId) || restaurantId <= 0) {
    return res.status(403).json({
      error: 'Ação restrita ao administrador, garçom ou atendente deste restaurante.',
    });
  }

  return next();
}
