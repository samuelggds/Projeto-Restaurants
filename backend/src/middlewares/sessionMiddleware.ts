import { NextFunction, Request, Response } from 'express';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';
import { TableSessionStatus } from '@prisma/client';

export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const rawSessionToken =
      req.headers['x-session-token'] || req.headers.authorization?.replace('Bearer ', '');
    const sessionToken = Array.isArray(rawSessionToken) ? rawSessionToken[0] : rawSessionToken;

    if (!sessionToken) {
      return res.status(401).json({
        error: 'SessionToken não informado',
      });
    }

    const session = await tableSessionRepository.findBySessionToken(sessionToken);

    if (!session) {
      return res.status(404).json({
        error: 'Sessão não encontrada',
      });
    }

    if (session.status !== TableSessionStatus.OPEN) {
      return res.status(403).json({
        error: 'Sessão encerrada',
      });
    }

    req.tableSession = {
      id: session.id,
      tableId: session.tableId,
      restaurantId: session.table.restaurantId,
    };

    return next();
  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro ao validar sessao',
    });
  }
}
