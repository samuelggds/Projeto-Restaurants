import { Request, Response } from 'express';
import createBannerService from '../services/CreateBannerService.js';

class CreateBannerController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;
      const { title, highlight, description, buttonLabel, image, active, position } = req.body;

      const banner = await createBannerService.execute({
        title,
        highlight,
        description,
        buttonLabel,
        image,
        active,
        position,
        restaurantId,
      });

      return res.status(201).json(banner);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao criar banner',
      });
    }
  }
}

export default new CreateBannerController();
