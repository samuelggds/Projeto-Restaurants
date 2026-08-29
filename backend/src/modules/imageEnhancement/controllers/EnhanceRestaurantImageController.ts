import type { Request, Response } from 'express';
import enhanceRestaurantImageService, {
  type RestaurantImagePurpose,
} from '../services/EnhanceRestaurantImageService.js';

class EnhanceRestaurantImageController {
  async handle(req: Request, res: Response, purpose: RestaurantImagePurpose = 'COVER') {
    try {
      return res.json(await enhanceRestaurantImageService.execute(req.body?.imageDataUrl, purpose));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível melhorar a imagem.',
      });
    }
  }
}

export default new EnhanceRestaurantImageController();
