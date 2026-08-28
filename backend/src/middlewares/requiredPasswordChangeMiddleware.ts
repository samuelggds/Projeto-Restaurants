import type { NextFunction, Request, Response } from 'express';

export const PASSWORD_CHANGE_REQUIRED_CODE = 'PASSWORD_CHANGE_REQUIRED';

const ALLOWED_AUTHENTICATED_REQUESTS = new Set(['GET /auth/me', 'PUT /auth/password']);

export function getNormalizedRequestPath(req: Request) {
  const path = `${req.baseUrl || ''}${req.path || ''}`.replace(/\/{2,}/gu, '/');
  if (path === '/') return path;
  return path.replace(/\/+$/u, '') || '/';
}

export function canAccessWhilePasswordChangeIsRequired(req: Request) {
  const routeKey = `${String(req.method || '').toUpperCase()} ${getNormalizedRequestPath(req)}`;
  return ALLOWED_AUTHENTICATED_REQUESTS.has(routeKey);
}

export function requiredPasswordChangeMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.mustChangePassword || canAccessWhilePasswordChangeIsRequired(req)) {
    return next();
  }

  return res.status(403).json({
    error: 'Troca de senha obrigatória antes de continuar.',
    code: PASSWORD_CHANGE_REQUIRED_CODE,
    mustChangePassword: true,
  });
}
