import type { Request, Response } from 'express';
import { safeErrorSummary } from '../../../services/telemetrySanitizer.js';

import getPublicRestaurantSettingsRevisionService from '../services/GetPublicRestaurantSettingsRevisionService.js';

function isDefaultRevisionPath(path: string) {
  return path === '/public/default/revision';
}

class GetPublicRestaurantSettingsRevisionController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Array.isArray(req.params.restaurantId)
        ? req.params.restaurantId[0]
        : req.params.restaurantId;
      const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

      const result = await getPublicRestaurantSettingsRevisionService.execute({
        restaurantId,
        slug,
        useDefault: isDefaultRevisionPath(req.path),
      });
      const etag = `"${result.revision}"`;

      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.setHeader('ETag', etag);

      if (
        req
          .get('if-none-match')
          ?.split(',')
          .some((value) => value.trim() === etag)
      ) {
        return res.status(304).end();
      }

      return res.status(200).json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (/^Restaurante (?:inválido|não encontrado ou indisponível)\.?$/u.test(message)) {
        return res.status(400).json({ error: message });
      }

      console.error('[PUBLIC_RESTAURANT_REVISION_ERROR]', {
        requestId: req.requestId,
        error: safeErrorSummary(error),
      });
      return res.status(500).json({
        error: 'Não foi possível atualizar os dados públicos do restaurante agora.',
        requestId: req.requestId,
      });
    }
  }
}

export default new GetPublicRestaurantSettingsRevisionController();
