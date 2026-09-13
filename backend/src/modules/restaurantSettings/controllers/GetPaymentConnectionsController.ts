import type { Request, Response } from 'express';
import service from '../services/GetPaymentConnectionsService.js';

class GetPaymentConnectionsController {
  async handle(req: Request, res: Response) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(await service.execute({ restaurantId: req.user.restaurantId }));
    } catch {
      return res
        .status(503)
        .json({ error: 'Não foi possível verificar as conexões de pagamento. Tente novamente.' });
    }
  }
}

export default new GetPaymentConnectionsController();
