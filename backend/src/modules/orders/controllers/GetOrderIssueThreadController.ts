import { Request, Response } from 'express';
import getOrderIssueThreadService from '../services/GetOrderIssueThreadService.js';

class GetOrderIssueThreadController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const result = await getOrderIssueThreadService.execute({
        orderId: id,
        requesterUserId: req.user?.id ?? null,
        requesterRole: req.user?.role || 'CLIENTE',
        requesterRestaurantId: req.user?.restaurantId ?? null,
        guestPublicId: req.guestOrderOwnership?.publicId || null,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar conversa do problema do pedido',
      });
    }
  }
}

export default new GetOrderIssueThreadController();
