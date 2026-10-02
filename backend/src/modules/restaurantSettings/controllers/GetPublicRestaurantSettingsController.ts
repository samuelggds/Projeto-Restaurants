import { Request, Response } from 'express';
import getPublicRestaurantSettingsService from '../services/GetPublicRestaurantSettingsService.js';
import { safeErrorSummary } from '../../../services/telemetrySanitizer.js';

class GetPublicRestaurantSettingsController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Array.isArray(req.params.restaurantId)
        ? req.params.restaurantId[0]
        : req.params.restaurantId;
      const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
      const useDefault = req.path.endsWith('/default');

      const settings = await getPublicRestaurantSettingsService.execute({
        restaurantId,
        slug,
        useDefault,
      });

      return res.status(200).json(settings);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (/^Restaurante (?:inválido|não encontrado ou indisponível)\.?$/u.test(message)) {
        return res.status(400).json({ error: message });
      }

      console.error('[PUBLIC_RESTAURANT_SETTINGS_ERROR]', {
        requestId: req.requestId,
        error: safeErrorSummary(error),
      });
      return res.status(500).json({
        error: 'Não foi possível carregar o restaurante agora.',
        requestId: req.requestId,
      });
    }
  }
}

export default new GetPublicRestaurantSettingsController();
