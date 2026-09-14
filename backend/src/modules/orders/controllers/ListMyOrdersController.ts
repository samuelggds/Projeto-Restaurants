import { Request, Response } from 'express';
import paginatedOrdersService from '../services/PaginatedOrdersService.js';
import { parseOrderListQuery } from '../domain/orderListQuery.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';

class ListMyOrdersController {
  async handle(req: Request, res: Response) {
    try {
      return res.json(await paginatedOrdersService.mine(req.user, parseOrderListQuery(req.query)));
    } catch (error: unknown) {
      return res.status(error instanceof OrderRequestError ? error.statusCode : 500).json({
        error: error instanceof OrderRequestError ? error.message : 'Erro ao listar pedidos do usuário.',
      });
    }
  }
}

export default new ListMyOrdersController();
