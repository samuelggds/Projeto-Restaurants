import { FuncionarioSubRole, UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

/** Reservation management is limited to this tenant's ADMIN and ATENDENTE. */
export function reservationManagementMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
  const restaurantId = Number(req.user.restaurantId);
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
    return res.status(403).json({ error: 'Restaurante não identificado.' });
  }
  const role = String(req.user.role || '').toUpperCase();
  const subRole = String(req.user.subRole || '').toUpperCase();
  if (role !== UserRole.ADMIN &&
      !(role === UserRole.FUNCIONARIO && subRole === FuncionarioSubRole.ATENDENTE)) {
    return res.status(403).json({ error: 'Reservas disponíveis somente para administradores e atendentes.' });
  }
  return next();
}
