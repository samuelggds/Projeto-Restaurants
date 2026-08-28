import { NextFunction, Request, Response } from 'express';
import { billingMiddleware } from './billingMiddleware.js';
import { resolveAccessToken } from '../modules/auth/security/accessToken.js';
import {
  getNormalizedRequestPath,
  requiredPasswordChangeMiddleware,
} from './requiredPasswordChangeMiddleware.js';

function canBypassBillingCheck(req: Request) {
  const role = String(req.user?.role || '').toUpperCase();
  const routePath = getNormalizedRequestPath(req);

  if (role === 'SUPER_ADMIN') {
    return true;
  }

  if (
    (routePath === '/auth/me' && req.method === 'GET') ||
    (routePath === '/auth/password' && req.method === 'PUT')
  ) {
    return true;
  }

  // A cobrança precisa continuar acessível durante o bloqueio para que o
  // administrador consiga pagar a mensalidade e reativar o restaurante.
  return routePath === '/billing' || routePath.startsWith('/billing/');
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não informado!' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const { user } = await resolveAccessToken(token);
    req.user = user;

    return requiredPasswordChangeMiddleware(req, res, () => {
      if (canBypassBillingCheck(req)) {
        return next();
      }

      return billingMiddleware(req, res, next);
    });
  } catch (_error: unknown) {
    return res.status(401).json({ error: 'Token inválido!' });
  }
}
