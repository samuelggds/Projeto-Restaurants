import type { NextFunction, Request, Response } from 'express';
import { FuncionarioSubRole, UserRole } from '@prisma/client';

/** Operations require a valid tenant admin, waiter or attendant identity. */
export function nfcRegistrationAccessMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado.' });
  const role = String(req.user.role || '').toUpperCase();
  const subRole = String(req.user.subRole || '').toUpperCase();
  const staff = role === UserRole.FUNCIONARIO &&
    (subRole === FuncionarioSubRole.GARCOM || subRole === FuncionarioSubRole.ATENDENTE);
  const restaurantId = Number(req.user.restaurantId);
  if ((!staff && role !== UserRole.ADMIN) || !Number.isInteger(restaurantId) || restaurantId <= 0) {
    return res.status(403).json({ error: 'Operação NFC restrita ao administrador, garçom ou atendente.' });
  }
  return next();
}
