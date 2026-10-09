import type { Request, Response } from 'express';
import lalamoveOnboardingService from '../services/LalamoveOnboardingService.js';

function actor(req: Request) {
  return { restaurantId: req.user.restaurantId, userId: req.user.id };
}

class LalamoveOnboardingController {
  async status(req: Request, res: Response) {
    try {
      const { restaurantId } = actor(req);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(await lalamoveOnboardingService.getStatus(restaurantId));
    } catch {
      return res.status(503).json({ error: 'Não foi possível consultar a conexão Lalamove.' });
    }
  }

  async request(req: Request, res: Response) {
    // The authenticated session, never JSON input, determines tenant and actor.
    if (
      req.body != null &&
      (typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length > 0)
    ) {
      return res.status(400).json({ error: 'Esta solicitação não aceita dados adicionais.' });
    }
    try {
      const { restaurantId, userId } = actor(req);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(202).json(
        await lalamoveOnboardingService.requestConnection(restaurantId, userId),
      );
    } catch {
      return res.status(503).json({ error: 'Não foi possível registrar a solicitação Lalamove.' });
    }
  }
}

export default new LalamoveOnboardingController();
