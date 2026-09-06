import type { NextFunction, Request, Response } from 'express';
import { FuncionarioSubRole, UserRole } from '@prisma/client';

export function orderSupportStaffMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const restaurantId = Number(req.user.restaurantId);
  const role = String(req.user.role || '').toUpperCase();
  const subRole = String(req.user.subRole || '').toUpperCase();
  const isAdmin = role === UserRole.ADMIN;
  const isAttendant = role === UserRole.FUNCIONARIO && subRole === FuncionarioSubRole.ATENDENTE;

  if ((!isAdmin && !isAttendant) || !Number.isInteger(restaurantId) || restaurantId <= 0) {
    return res.status(403).json({ error: 'Acesso restrito ao atendimento de pedidos.' });
  }

  return next();
}
