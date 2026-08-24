import { Request, Response } from 'express';
import requestPinAssistanceService from '../services/RequestPinAssistanceService.js';

class RequestPinAssistanceController {
  async handle(req: Request, res: Response) {
    try {
      const { tableId, tableNumber, restaurantId, restaurantSlug } = req.body;

      const result = await requestPinAssistanceService.execute({
        tableId,
        tableNumber,
        restaurantId,
        restaurantSlug,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(410).json({
        error: error instanceof Error ? error.message : 'Erro ao solicitar apoio de PIN',
        code: 'PIN_FLOW_DISABLED',
      });
    }
  }
}

export default new RequestPinAssistanceController();
