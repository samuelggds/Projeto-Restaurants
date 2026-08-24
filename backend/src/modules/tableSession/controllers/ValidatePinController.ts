import { Request, Response } from 'express';
import validatePinService from '../services/ValidatePinService.js';

class ValidatePinController {
  async handle(req: Request, res: Response) {
    try {
      const { tableId, pin, tableNumber, restaurantId, restaurantSlug } = req.body;

      const result = await validatePinService.execute({
        tableId,
        pin,
        tableNumber,
        restaurantId,
        restaurantSlug,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao validar PIN',
      });
    }
  }
}

export default new ValidatePinController();
