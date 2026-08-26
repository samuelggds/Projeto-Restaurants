import type { Request, Response } from 'express';
import updateTableAccountSettingsService from '../services/UpdateTableAccountSettingsService.js';

class UpdateTableAccountSettingsController {
  async handle(req: Request, res: Response) {
    try {
      const settings = await updateTableAccountSettingsService.execute(
        req.user.restaurantId,
        req.body,
      );
      return res.status(200).json(settings);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao salvar configurações da mesa.',
      });
    }
  }
}

export default new UpdateTableAccountSettingsController();
