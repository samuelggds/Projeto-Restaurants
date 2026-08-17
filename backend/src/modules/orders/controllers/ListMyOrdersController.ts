import { Request, Response } from 'express';
import listMyOrdersService from '../services/ListMyOrdersService.js';

class ListMyOrdersController {
  async handle(req: Request, res: Response) {
    try {
      const { id: userId, restaurantId } = req.user;

      const orders = await listMyOrdersService.execute(userId, restaurantId);

      return res.json(orders);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao listar pedidos do usuario',
      });
    }
  }
}

export default new ListMyOrdersController();
