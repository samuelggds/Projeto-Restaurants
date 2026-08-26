import type { Request, Response } from 'express';
import getTableAccountSettingsService from '../services/GetTableAccountSettingsService.js';

class GetTableAccountSettingsController {
  async handle(req: Request, res: Response) {
    try {
      const settings = await getTableAccountSettingsService.execute(req.user.restaurantId);
      return res.status(200).json(settings);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao consultar configurações da mesa.',
      });
    }
  }
}

export default new GetTableAccountSettingsController();
