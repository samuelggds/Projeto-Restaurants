import type { Request, Response } from 'express';
import service from '../services/StartPagBankOAuthService.js';

class StartPagBankOAuthController {
  async handle(req: Request, res: Response) {
    try {
      const result = await service.execute({
        restaurantId: req.user?.restaurantId,
        userId: req.user?.id,
      });
      return res.json(result);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao conectar PagBank.',
      });
    }
  }
}

export default new StartPagBankOAuthController();
