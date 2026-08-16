import { Request, Response } from 'express';

export function notFoundMiddleware(req: Request, res: Response) {
  return res.status(404).json({
    error: 'Rota nao encontrada',
    requestId: req.requestId,
  });
}
