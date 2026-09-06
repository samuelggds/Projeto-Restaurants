import { Request, Response } from 'express';
import reportOrderIssueService from '../services/ReportOrderIssueService.js';

class ReportOrderIssueController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { message } = req.body || {};

      const result = await reportOrderIssueService.execute(
        id,
        {
          userId: req.user?.id ?? null,
          restaurantId: req.user?.restaurantId ?? null,
          role: req.user?.role || 'CLIENTE',
          guestPublicId: req.guestOrderOwnership?.publicId || null,
        },
        message,
      );

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao relatar problema no pedido',
      });
    }
  }
}

export default new ReportOrderIssueController();
