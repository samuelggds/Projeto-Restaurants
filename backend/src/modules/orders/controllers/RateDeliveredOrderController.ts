import type { Request, Response } from 'express';
import rateDeliveredOrderService from '../services/RateDeliveredOrderService.js';

class RateDeliveredOrderController {
  async handle(req: Request, res: Response) {
    try {
      const result = await rateDeliveredOrderService.execute({
        orderId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        customerId: Number(req.user?.id || 0),
        role: req.user?.role || 'CLIENTE',
        guestPublicId: req.guestOrderTracking?.publicId || null,
        rating: req.body?.rating,
      });
      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível salvar a avaliação.',
      });
    }
  }
}

export default new RateDeliveredOrderController();
