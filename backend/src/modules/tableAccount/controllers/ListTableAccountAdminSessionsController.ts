import type { Request, Response } from 'express';
import listTableAccountAdminSessionsService from '../services/ListTableAccountAdminSessionsService.js';
import { TablePaymentError } from '../services/tablePaymentSupport.js';

class ListTableAccountAdminSessionsController {
  async handle(req: Request, res: Response) {
    try {
      const result = await listTableAccountAdminSessionsService.execute({
        id: Number(req.user?.id),
        role: String(req.user?.role || '') as never,
        subRole: (req.user?.subRole || null) as never,
        restaurantId: Number(req.user?.restaurantId || 0),
      });
      return res.status(200).json(result);
    } catch (error) {
      const status = error instanceof TablePaymentError ? error.statusCode : 400;
      return res.status(status).json({
        error: error instanceof Error ? error.message : 'Erro ao consultar contas de mesa.',
      });
    }
  }
}

export default new ListTableAccountAdminSessionsController();
