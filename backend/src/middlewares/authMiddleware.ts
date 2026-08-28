import { NextFunction, Request, Response } from 'express';
import { billingMiddleware, billingRecoveryMiddleware } from './billingMiddleware.js';
import { resolveAccessToken } from '../modules/auth/security/accessToken.js';
import {
  getNormalizedRequestPath,
  requiredPasswordChangeMiddleware,
} from './requiredPasswordChangeMiddleware.js';

export function canBypassBillingCheck(req: Request) {
  const role = String(req.user?.role || '').toUpperCase();
  const routePath = getNormalizedRequestPath(req);
  const method = String(req.method || '').toUpperCase();

  if (role === 'SUPER_ADMIN') {
    return true;
  }

  if (
    (routePath === '/auth/me' && method === 'GET') ||
    (routePath === '/auth/password' && method === 'PUT')
  ) {
    return true;
  }

  return false;
}

export function canAccessBillingRecoveryRoute(req: Request) {
  const role = String(req.user?.role || '').toUpperCase();
  if (role !== 'ADMIN') return false;

  const routePath = getNormalizedRequestPath(req);
  const method = String(req.method || '').toUpperCase();

  // Durante inadimplência, o ADMIN recebe apenas as leituras necessárias para
  // entender a cobrança e a ação pontual de regenerar o Pix. Alterações de
  // plano e qualquer operação do restaurante continuam bloqueadas.
  if (
    method === 'GET' &&
    ['/billing/plans', '/billing/invoices', '/subscription'].includes(routePath)
  ) {
    return true;
  }

  return method === 'POST' && /^\/billing\/invoices\/\d+\/regenerate-link$/u.test(routePath);
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

      if (canAccessBillingRecoveryRoute(req)) {
        return billingRecoveryMiddleware(req, res, next);
      }

      return billingMiddleware(req, res, next);
    });
  } catch (_error: unknown) {
    return res.status(401).json({ error: 'Token inválido!' });
  }
}
