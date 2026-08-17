import { Request, Response } from 'express';
import listBannerService from '../services/ListBannerService.js';

class ListBannerController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const banners = await listBannerService.execute({
        restaurantId,
      });

      return res.status(200).json(banners);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao listar banners',
      });
    }
  }
}

export default new ListBannerController();
