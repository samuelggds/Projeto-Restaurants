import type { NextFunction, Request, Response } from 'express';
import getDeliveryTrackingService from '../services/GetDeliveryTrackingService.js';

class GetDeliveryTrackingController {
  async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await getDeliveryTrackingService.execute({
        orderId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        userId: Number(req.user.id || 0),
        restaurantId: req.user.restaurantId,
        role: req.user.role,
      });
      return res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (/Pedido inválido|apenas para pedidos de delivery/i.test(message)) {
        return res.status(400).json({ error: message });
      }
      if (/Pedido não encontrado/i.test(message)) {
        return res.status(404).json({ error: message });
      }
      if (/não pode acompanhar|conta de .*não está ativa/i.test(message)) {
        return res.status(403).json({ error: message });
      }
      return next(error);
    }
  }
}

export default new GetDeliveryTrackingController();
