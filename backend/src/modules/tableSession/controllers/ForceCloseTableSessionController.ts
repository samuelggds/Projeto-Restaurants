import type { Request, Response } from 'express';
import forceCloseTableSessionService from '../services/ForceCloseTableSessionService.js';

class ForceCloseTableSessionController {
  async handle(req: Request, res: Response) {
    try {
      const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await forceCloseTableSessionService.execute({
        sessionId,
        actorUserId: req.user.id,
        restaurantId: req.user.restaurantId,
        reason: req.body?.reason,
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao forçar o fechamento da mesa.',
      });
    }
  }
}

export default new ForceCloseTableSessionController();
