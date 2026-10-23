import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import tableAccountRepository from '../modules/tableAccount/repositories/TableAccountRepository.js';

const sessionPublicIdSchema = z.string().uuid();

export async function tableAccountSessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsedPublicId = sessionPublicIdSchema.safeParse(req.params.sessionPublicId);
    if (!parsedPublicId.success) {
      return res.status(404).json({
        error: 'Conta da mesa não encontrada.',
        code: 'TABLE_ACCOUNT_NOT_FOUND',
      });
    }

    const session = await tableAccountRepository.findSessionContextByPublicId(parsedPublicId.data);
    if (!session) {
      return res.status(404).json({
        error: 'Conta da mesa não encontrada ou já encerrada.',
        code: 'TABLE_ACCOUNT_NOT_FOUND',
      });
    }
    if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
      return res.status(403).json({
        error: 'A sessão desta mesa expirou. Peça ao garçom para abrir um novo atendimento.',
        code: 'TABLE_ACCOUNT_EXPIRED',
      });
    }

    req.tableSession = {
      id: session.id,
      publicId: session.publicId,
      tableId: session.tableId,
      restaurantId: session.restaurantId,
      status: session.status,
    };
    return next();
  } catch (error: unknown) {
    return res.status(500).json({
      error: 'Não foi possível validar a conta desta mesa.',
      ...(process.env.NODE_ENV === 'development' && error instanceof Error
        ? { detail: error.message }
        : {}),
    });
  }
}
