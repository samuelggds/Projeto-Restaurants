import type { NextFunction, Request, Response } from 'express';
import { resolveAccessToken } from '../modules/auth/security/accessToken.js';
import { requiredPasswordChangeMiddleware } from './requiredPasswordChangeMiddleware.js';

/**
 * Reconhece um cliente autenticado em rotas que também aceitam convidados.
 * A ausência do header é válida; um token enviado e inválido não é ignorado.
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token inválido!' });
  }

  try {
    const { user } = await resolveAccessToken(token);
    req.user = user;

    return requiredPasswordChangeMiddleware(req, res, next);
  } catch {
    return res.status(401).json({ error: 'Token inválido!' });
  }
}
