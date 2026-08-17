import { Request, Response } from 'express';
import cancelOrderService from '../services/CancelOrderService.js';

class CancelOrderController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { id: userId, restaurantId } = req.user;

      const order = await cancelOrderService.execute(id, userId, restaurantId);

      return res.json(order);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao cancelar pedido',
      });
    }
  }
}

export default new CancelOrderController();
