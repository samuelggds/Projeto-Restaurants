import type { Request, Response } from 'express';
import claimOrderForDeliveryService from '../services/ClaimOrderForDeliveryService.js';

class ClaimOrderForDeliveryController {
  async handle(req: Request, res: Response) {
    try {
      const order = await claimOrderForDeliveryService.execute({
        orderId: Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
        restaurantId: Number(req.user.restaurantId || 0),
        courierId: Number(req.user.id || 0),
        role: req.user.role,
      });
      return res.status(200).json(order);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao retirar pedido',
      });
    }
  }
}

export default new ClaimOrderForDeliveryController();
