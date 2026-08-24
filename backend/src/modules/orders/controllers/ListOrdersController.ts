import { Request, Response } from 'express';
import listOrdersService from '../services/ListOrdersService.js';
import { OrderStatus } from '@prisma/client';

class ListOrdersController {
  async handle(req: Request, res: Response) {
    try {
      const status = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;
      const normalizedStatus = status ? (String(status).toUpperCase() as OrderStatus) : undefined;

      if (normalizedStatus && !Object.values(OrderStatus).includes(normalizedStatus)) {
        return res.status(400).json({ error: 'Status de pedido inválido.' });
      }

      const restaurantId = req.user.restaurantId;

      const orders = await listOrdersService.execute(
        restaurantId,
        normalizedStatus,
        req.user.role,
        req.user.id,
        req.user.subRole,
      );

      return res.json(orders);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao listar pedidos',
      });
    }
  }
}

export default new ListOrdersController();
