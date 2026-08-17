import type { Request, Response } from 'express';
import enhanceRestaurantImageService from '../services/EnhanceRestaurantImageService.js';

class EnhanceRestaurantImageController {
  async handle(req: Request, res: Response) {
    try {
      return res.json(await enhanceRestaurantImageService.execute(req.body?.imageDataUrl));
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível melhorar a imagem.',
      });
    }
  }
}

export default new EnhanceRestaurantImageController();
