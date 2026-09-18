import { Request, Response } from 'express';
import disconnectMercadoPagoService from '../services/DisconnectMercadoPagoService.js';

class DisconnectMercadoPagoController {
  async handle(req: Request, res: Response) {
    try {
      const result = await disconnectMercadoPagoService.execute({
        restaurantId: req.user?.restaurantId,
      });
      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível desconectar a conta Mercado Pago.',
      });
    }
  }
}

export default new DisconnectMercadoPagoController();
