import type { Request, Response } from 'express';
import service from '../services/LalamoveSandboxTrackingService.js';
import { LalamoveQuoteError } from '../services/LalamoveQuotationService.js';

class LalamoveSandboxTrackingController {
  async refresh(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const dispatch = await service.refresh({
        restaurantId: Number(req.user?.restaurantId),
        actorId: Number(req.user?.id),
        orderId: Number(req.params.orderId),
      });
      return res.json({ dispatch });
    } catch (error) {
      return res.status(error instanceof LalamoveQuoteError ? error.statusCode : 503).json({
        error: error instanceof LalamoveQuoteError ? error.message : 'Não foi possível atualizar o rastreamento.',
      });
    }
  }
}
export default new LalamoveSandboxTrackingController();
