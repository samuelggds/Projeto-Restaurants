import type { NextFunction, Request, Response } from 'express';
import { FuncionarioSubRole, UserRole } from '@prisma/client';

/**
 * Restricts operational dining-room actions to the restaurant administrator or
 * to an employee explicitly registered as a waiter. Kitchen and courier users
 * must not be able to assume calls or operate table sessions.
 */
export function waiterMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const role = String(req.user.role || '').toUpperCase();
  const subRole = String(req.user.subRole || '').toUpperCase();
  const isAdmin = role === UserRole.ADMIN;
  const isWaiter = role === UserRole.FUNCIONARIO && subRole === FuncionarioSubRole.GARCOM;

  if (!isAdmin && !isWaiter) {
    return res.status(403).json({
      error: 'Esta ação está disponível apenas para o administrador ou garçons cadastrados.',
    });
  }

  const restaurantId = Number(req.user.restaurantId || 0);
  if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
    return res.status(403).json({ error: 'Restaurante não identificado para este usuário.' });
  }

  return next();
}
