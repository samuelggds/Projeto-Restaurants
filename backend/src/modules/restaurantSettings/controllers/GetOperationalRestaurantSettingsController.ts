import type { Request, Response } from 'express';
import service from '../services/GetOperationalRestaurantSettingsService.js';

class GetOperationalRestaurantSettingsController {
  async handle(req: Request, res: Response) {
    try {
      const result = await service.execute(Number(req.user?.restaurantId));
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).json(result);
    } catch {
      return res.status(500).json({ error: 'Não foi possível carregar configurações operacionais.' });
    }
  }
}

export default new GetOperationalRestaurantSettingsController();
