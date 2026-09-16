import { Request, Response } from 'express';
import getPublicCardPaymentConfigService from '../services/GetPublicCardPaymentConfigService.js';

class GetPublicCardPaymentConfigController {
  async handle(req: Request, res: Response) {
    try {
      const config = await getPublicCardPaymentConfigService.execute(req.params.restaurantId);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(config);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Pagamento com cartão indisponível no momento.',
      });
    }
  }
}

export default new GetPublicCardPaymentConfigController();