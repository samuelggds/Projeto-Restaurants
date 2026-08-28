import type { Request, Response } from 'express';
import restaurantAccessService from '../../billing/services/RestaurantAccessService.js';

class GetRestaurantAvailabilityController {
  async handle(req: Request, res: Response) {
    const restaurantId = Number(req.params.id || 0);
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      return res.status(400).json({ error: 'Restaurante inválido.' });
    }

    try {
      const decision = await restaurantAccessService.evaluate(restaurantId);
      if (!decision) return res.status(404).json({ error: 'Restaurante não encontrado.' });

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        restaurantId,
        available: !('code' in decision),
      });
    } catch {
      return res.status(500).json({ error: 'Não foi possível consultar a disponibilidade.' });
    }
  }
}

export default new GetRestaurantAvailabilityController();
