import type { Request, Response } from 'express';
import confirmOrderDeliveryReceivedService from '../services/ConfirmOrderDeliveryReceivedService.js';

class ConfirmOrderDeliveryReceivedController {
  async handle(req: Request, res: Response) {
    try {
      const order = await confirmOrderDeliveryReceivedService.execute({
        orderId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        restaurantId: Number(req.user?.restaurantId || 0),
        customerId: Number(req.user?.id || 0),
        role: req.user?.role || 'CLIENTE',
        guestPublicId: req.guestOrderTracking?.publicId || null,
      });

      return res.status(200).json(order);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível confirmar o recebimento do pedido.',
      });
    }
  }
}

export default new ConfirmOrderDeliveryReceivedController();
