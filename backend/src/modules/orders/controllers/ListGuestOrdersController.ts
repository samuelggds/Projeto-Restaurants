import type { Request, Response } from 'express';
import listGuestOrdersService from '../services/ListGuestOrdersService.js';

class ListGuestOrdersController {
  async handle(req: Request, res: Response) {
    try {
      const result = await listGuestOrdersService.execute({
        proofs: Array.isArray(req.body?.proofs) ? req.body.proofs : [],
        restaurantId: req.body?.restaurantId ?? null,
        search: req.body?.search ?? '',
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os pedidos deste visitante.',
      });
    }
  }
}

export default new ListGuestOrdersController();
