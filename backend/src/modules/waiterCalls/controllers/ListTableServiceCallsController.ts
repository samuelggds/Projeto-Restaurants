import type { Request, Response } from 'express';
import listTableServiceCallsService from '../services/ListTableServiceCallsService.js';

function first(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

class ListTableServiceCallsController {
  async handle(req: Request, res: Response) {
    try {
      const calls = await listTableServiceCallsService.execute({
        restaurantId: req.user.restaurantId,
        status: String(first(req.query.status) || ''),
        type: String(first(req.query.type) || ''),
        tableNumber: String(first(req.query.tableNumber) || ''),
      });
      return res.status(200).json(calls);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível listar os chamados.',
      });
    }
  }
}

export default new ListTableServiceCallsController();
