import { Request, Response } from 'express';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';

class ConfirmOrderPixPaymentController {
  async handle(req: Request, res: Response) {
    try {
      const { orderId, paymentId, restaurantId } = req.body;
      const resolvedRestaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: restaurantId,
        contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null,
      });

      const order = await finalizeOrderPixPaymentService.execute({
        orderId,
        paymentId,
        restaurantId: resolvedRestaurantId,
      });

      return res.status(200).json(order);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao confirmar pagamento PIX do pedido',
      });
    }
  }
}

export default new ConfirmOrderPixPaymentController();
