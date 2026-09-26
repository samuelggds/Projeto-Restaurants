import type { Request, Response } from 'express';
import tableAccessRequestService from '../services/TableAccessRequestService.js';

class ListTableAccessRequestsController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Number(req.user.restaurantId);
      const requests = await tableAccessRequestService.listPending(restaurantId);
      return res.status(200).json({ requests });
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível listar as solicitações de acesso.',
      });
    }
  }
}

export default new ListTableAccessRequestsController();
