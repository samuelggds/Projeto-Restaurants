import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { billingMiddleware } from './billingMiddleware.js';

function canBypassBillingCheck(req: Request) {
  const role = String(req.user?.role || '').toUpperCase();

  if (role === 'SUPER_ADMIN') {
    return true;
  }

  if (req.baseUrl === '/auth' && req.path === '/me') {
    return true;
  }

  // A cobrança precisa continuar acessível durante o bloqueio para que o
  // administrador consiga pagar a mensalidade e reativar o restaurante.
  return req.baseUrl === '/billing' || req.path.startsWith('/billing/');
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não informado!' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (typeof decoded === 'string') {
      return res.status(401).json({ error: 'Token inválido!' });
    }

    req.user = {
      id: Number(decoded.id || 0),
      role: String(decoded.role || ''),
      subRole:
        decoded.subRole === null || decoded.subRole === undefined ? null : String(decoded.subRole),
      restaurantId:
        decoded.restaurantId === null || decoded.restaurantId === undefined
          ? null
          : Number(decoded.restaurantId),
      email: decoded.email === null || decoded.email === undefined ? null : String(decoded.email),
    };

    if (canBypassBillingCheck(req)) {
      return next();
    }

    return billingMiddleware(req, res, next);
  } catch (_error: unknown) {
    return res.status(401).json({ error: 'Token inválido!' });
  }
}
