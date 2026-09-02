import { FuncionarioSubRole, UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';

export function attendantMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const role = String(req.user.role || '').toUpperCase();
  const subRole = String(req.user.subRole || '').toUpperCase();
  const isAttendant = role === UserRole.FUNCIONARIO && subRole === FuncionarioSubRole.ATENDENTE;

  if (!isAttendant) {
    return res.status(403).json({
      error: 'Esta área está disponível exclusivamente para atendentes cadastrados.',
    });
  }

  const restaurantId = Number(req.user.restaurantId || 0);
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    return res.status(403).json({ error: 'Restaurante não identificado para este usuário.' });
  }

  return next();
}
