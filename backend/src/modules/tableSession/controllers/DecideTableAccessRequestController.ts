import type { Request, Response } from 'express';
import tableAccessRequestService from '../services/TableAccessRequestService.js';

class DecideTableAccessRequestController {
  async handle(req: Request, res: Response) {
    try {
      const decision = String(req.body?.decision || '').toUpperCase();
      if (decision !== 'APPROVE' && decision !== 'REJECT') {
        return res.status(400).json({ error: 'Decisão inválida para esta solicitação.' });
      }

      const request = await tableAccessRequestService.decide({
        publicId: String(req.params.id || ''),
        restaurantId: Number(req.user.restaurantId),
        decidedById: Number(req.user.id),
        decision,
      });

      return res.status(200).json({ request });
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível processar a solicitação de acesso.',
      });
    }
  }
}

export default new DecideTableAccessRequestController();
