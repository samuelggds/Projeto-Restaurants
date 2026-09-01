import { Request, Response } from 'express';
import getOrderCardPaymentStatusService from '../services/GetOrderCardPaymentStatusService.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';

class GetOrderCardPaymentStatusController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: req.body.restaurantId,
        contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null,
      });
      const result = await getOrderCardPaymentStatusService.execute({
        orderPublicId: req.body.orderPublicId,
        restaurantId,
        userId: req.user?.id,
        tableSessionId: req.tableSession?.id,
        participantId: req.tableParticipant?.id,
        guest: req.user?.isGuest === true,
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(404).json({
        error: error instanceof Error ? error.message : 'Pagamento com cartão não encontrado.',
      });
    }
  }
}

export default new GetOrderCardPaymentStatusController();
