import { Request, Response } from 'express';
import orderPixPaymentService from '../services/OrderPixPaymentService.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';

class GetOrderPixPaymentStatusController {
  async handle(req: Request, res: Response) {
    try {
      const { paymentId, restaurantId } = req.body;
      const resolvedRestaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: restaurantId,
        contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null,
      });

      const result = await orderPixPaymentService.getPaymentStatus({
        paymentId,
        restaurantId: resolvedRestaurantId,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao consultar status do pagamento PIX',
      });
    }
  }
}

export default new GetOrderPixPaymentStatusController();
