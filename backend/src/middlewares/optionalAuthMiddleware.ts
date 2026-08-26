import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Reconhece um cliente autenticado em rotas que também aceitam convidados.
 * A ausência do header é válida; um token enviado e inválido não é ignorado.
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token inválido!' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof decoded === 'string') {
      return res.status(401).json({ error: 'Token inválido!' });
    }

    const userId = Number(decoded.id || 0);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Token inválido!' });
    }

    req.user = {
      id: userId,
      role: String(decoded.role || ''),
      subRole:
        decoded.subRole === null || decoded.subRole === undefined ? null : String(decoded.subRole),
      restaurantId:
        decoded.restaurantId === null || decoded.restaurantId === undefined
          ? null
          : Number(decoded.restaurantId),
      email: decoded.email === null || decoded.email === undefined ? null : String(decoded.email),
    };

    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido!' });
  }
}
