import type { Request, Response } from 'express';
import joinTableSessionService from '../services/JoinTableSessionService.js';
import { PublicTableResolutionError } from '../../table/services/ResolvePublicTableService.js';

class JoinTableSessionController {
  async handle(req: Request, res: Response) {
    try {
      const result = await joinTableSessionService.execute({
        tableId: req.body?.tableId,
        tableNumber: req.body?.tableNumber,
        tableToken: req.body?.tableToken || req.body?.token,
        restaurantId: req.body?.restaurantId,
        restaurantSlug: req.body?.restaurantSlug || req.body?.slug,
      });
      return res.status(200).json(result);
    } catch (error: unknown) {
      const statusCode = error instanceof PublicTableResolutionError ? error.statusCode : 400;
      return res.status(statusCode).json({
        error: error instanceof Error ? error.message : 'Não foi possível acessar a mesa.',
        ...(error instanceof PublicTableResolutionError ? { code: error.code } : {}),
      });
    }
  }
}

export default new JoinTableSessionController();
