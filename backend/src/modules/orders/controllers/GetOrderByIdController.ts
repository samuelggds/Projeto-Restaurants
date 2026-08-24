import { Request, Response } from 'express';
import getOrderByIdService from '../services/GetOrderByIdService.js';

class GetOrderByIdController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const restaurantId = req.user.restaurantId;

      const order = await getOrderByIdService.execute(
        id,
        restaurantId,
        req.user.role,
        req.user.subRole,
        req.user.id,
      );

      return res.json(order);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao buscar pedido',
      });
    }
  }
}

export default new GetOrderByIdController();
