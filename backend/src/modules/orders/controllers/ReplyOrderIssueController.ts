import { Request, Response } from 'express';
import replyOrderIssueService from '../services/ReplyOrderIssueService.js';

class ReplyOrderIssueController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { restaurantId, id: adminUserId } = req.user;
      const { message } = req.body || {};

      const result = await replyOrderIssueService.execute({
        orderId: id,
        restaurantId,
        adminUserId,
        replyMessage: message,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao responder problema do pedido',
      });
    }
  }
}

export default new ReplyOrderIssueController();
