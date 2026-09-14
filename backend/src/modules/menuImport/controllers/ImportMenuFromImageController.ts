import { Request, Response } from 'express';
import importMenuFromImageService from '../services/ImportMenuFromImageService.js';
import aiCreditService, { AiCreditsExhaustedError } from '../../aiSupport/services/AiCreditService.js';

class ImportMenuFromImageController {
  async handle(req: Request, res: Response) {
    try {
      const { imageUrl, restaurantId: bodyRestaurantId } = req.body;
      const resolvedRestaurantId = Number(req.user?.restaurantId || bodyRestaurantId || 0);
      const actor = {
        userId: Number(req.user?.id || 0),
        restaurantId: resolvedRestaurantId,
        userName: req.user?.email,
        userRole: req.user?.role,
      };
      await aiCreditService.assertAvailable(actor);

      const summary = await importMenuFromImageService.execute(
        {
          imageUrl,
          restaurantId: resolvedRestaurantId,
        },
        {
          userId: actor.userId || undefined,
          userName: actor.userName || undefined,
          userRole: actor.userRole || undefined,
        },
      );
      const credits = await aiCreditService.recordUsage({
        ...actor,
        feature: 'IMPORT_MENU_FROM_IMAGE',
        model: summary.aiUsage.model,
        costUsd: summary.aiUsage.costUsd,
        usage: summary.aiUsage.usage,
      });
      const { aiUsage: _aiUsage, ...publicSummary } = summary;
      return res.status(201).json({ ...publicSummary, credits });
    } catch (error: unknown) {
      if (error instanceof AiCreditsExhaustedError) {
        return res.status(402).json({ error: error.message, code: error.code });
      }
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Erro ao importar cardapio a partir da imagem',
      });
    }
  }
}

export default new ImportMenuFromImageController();
