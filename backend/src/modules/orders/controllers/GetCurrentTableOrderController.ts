import { Request, Response } from 'express';
import getCurrentTableOrderService from '../services/GetCurrentTableOrderService.js';

class GetCurrentTableOrderController {
  async handle(req: Request, res: Response) {
    try {
      const order = await getCurrentTableOrderService.execute({
        tableSessionId: req.tableSession?.id,
        restaurantId: req.tableSession?.restaurantId,
        participantId: req.tableParticipant?.id,
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ order });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Erro ao obter pedido atual da mesa',
      });
    }
  }
}

export default new GetCurrentTableOrderController();
