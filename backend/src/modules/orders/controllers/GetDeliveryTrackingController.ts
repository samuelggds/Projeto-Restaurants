import type { Request, Response } from 'express';
import getDeliveryTrackingService from '../services/GetDeliveryTrackingService.js';

class GetDeliveryTrackingController {
  async handle(req: Request, res: Response) {
    try {
      const result = await getDeliveryTrackingService.execute({
        orderId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        userId: Number(req.user.id || 0),
        restaurantId: req.user.restaurantId,
        role: req.user.role,
      });
      return res.json(result);
    } catch (error: unknown) {
      return res
        .status(403)
        .json({ error: error instanceof Error ? error.message : 'Erro ao consultar rastreamento' });
    }
  }
}

export default new GetDeliveryTrackingController();
