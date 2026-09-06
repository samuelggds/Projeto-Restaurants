import type { Request, Response } from 'express';
import claimGuestOrdersService from '../services/ClaimGuestOrdersService.js';

class ClaimGuestOrdersController {
  async handle(req: Request, res: Response) {
    try {
      const result = await claimGuestOrdersService.execute({
        requesterUserId: req.user?.id ?? 0,
        requesterRole: req.user?.role || '',
        requesterRestaurantId: req.user?.restaurantId ?? null,
        proofs: Array.isArray(req.body?.proofs) ? req.body.proofs : [],
      });
      return res.json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível recuperar os pedidos feitos como visitante.',
      });
    }
  }
}

export default new ClaimGuestOrdersController();
