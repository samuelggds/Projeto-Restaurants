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


/**
 * Rotas de mesa são autenticadas pelo token opaco da sessão e, depois,
 * pela identidade do participante. Um Authorization antigo/inválido do
 * navegador não pode impedir esse fluxo, mas também nunca concede acesso.
 *
 * Sem x-session-token, o comportamento continua fail-closed como no
 * optionalAuthMiddleware normal.
 */
export async function optionalTableSessionAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const [scheme, token] = authHeader.split(' ');
  const hasTableSessionToken = Boolean(req.headers['x-session-token']);

  if (scheme !== 'Bearer' || !token) {
    return hasTableSessionToken ? next() : res.status(401).json({ error: 'Token inválido!' });
  }

  try {
    const { user } = await resolveAccessToken(token);
    req.user = user;
    return requiredPasswordChangeMiddleware(req, res, next);
  } catch {
    // A identidade normal não foi aceita. Em uma rota de mesa, a requisição
    // ainda precisa passar por sessionMiddleware + tableParticipantMiddleware.
    // Portanto, ignorar este header não cria bypass de tenant nem de participante.
    return hasTableSessionToken ? next() : res.status(401).json({ error: 'Token inválido!' });
  }
}
